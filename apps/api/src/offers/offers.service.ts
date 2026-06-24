import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import {
  OrderStatus,
  OfferStatus,
  WalletTransactionType,
  Prisma,
  ContactDisclosureReason,
} from '@prisma/client';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { ErrorCode } from '@intender/shared';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
  ) {}

  async createOffer(supplierId: string, orderId: string, dto: CreateOfferDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== OrderStatus.PUBLISHED) {
      throw new BadRequestException({
        message: 'Нельзя откликнуться на этот заказ',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    const supplier = await this.prisma.user.findUnique({
      where: { id: supplierId },
      include: { organization: true },
    });

    if (!supplier?.organization) {
      throw new ForbiddenException({
        message: 'Только организации могут подавать отклики',
        code: ErrorCode.FORBIDDEN,
      });
    }

    const supplierOrganizationId = supplier.organization.id;
    const SUBMISSION_FEE_MINOR = 5000;

    let offer: any;

    try {
      await this.walletsService.charge(
        supplierId,
        SUBMISSION_FEE_MINOR,
        WalletTransactionType.OFFER_SUBMISSION,
        dto.idempotencyKey,
        orderId,
        async (tx) => {
          offer = await tx.offer.create({
            data: {
              orderId,
              supplierOrganizationId,
              status: OfferStatus.ACTIVE,
              versions: {
                create: {
                  versionNumber: 1,
                  pricePerUnitMinor: dto.pricePerUnitMinor,
                  snapshotQuantity: order.quantity,
                  goodsTotalMinor: dto.goodsTotalMinor,
                  deliveryCostMinor: dto.deliveryCostMinor,
                  grandTotalMinor: dto.grandTotalMinor,
                  deliveryDays: dto.deliveryDays,
                  departureRegion: dto.departureRegion,
                  departureDistrict: dto.departureDistrict,
                  departureCity: dto.departureCity,
                  departureLat: dto.departureLat,
                  departureLng: dto.departureLng,
                  brandModel: dto.brandModel,
                  comment: dto.comment,
                  vatStatus: dto.vatStatus,
                  paymentTerms: dto.paymentTerms,
                  confirmations: dto.confirmations as any,
                },
              },
            },
            include: {
              versions: true,
            },
          });

          await tx.offer.update({
            where: { id: offer.id },
            data: { currentVersionId: offer.versions[0].id },
          });

          await tx.notification.create({
            data: {
              userId: order.buyerId,
              type: 'OFFER_RECEIVED',
              title: 'Новый отклик',
              message: `На ваш заказ "${order.title}" поступил новый отклик!`,
              payload: { orderId: order.id, offerId: offer.id },
            },
          });
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          message: 'Вы уже подали отклик на этот заказ',
          code: ErrorCode.OFFER_ALREADY_EXISTS,
        });
      }
      if (
        error instanceof ConflictException &&
        (error.getResponse() as any).code === ErrorCode.IDEMPOTENCY_CONFLICT
      ) {
        const existingOffer = await this.prisma.offer.findUnique({
          where: { orderId_supplierOrganizationId: { orderId, supplierOrganizationId } },
          include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
        });
        if (existingOffer) return existingOffer;
      }
      throw error;
    }

    return this.prisma.offer.findUnique({
      where: { id: offer.id },
      include: {
        versions: {
          where: { id: offer.versions[0].id },
        },
      },
    });
  }

  async updateOffer(supplierId: string, offerId: string, dto: UpdateOfferDto) {
    const supplier = await this.prisma.user.findUnique({
      where: { id: supplierId },
      include: { organization: true },
    });
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!offer) throw new NotFoundException({ message: 'Отклик не найден' });
    if (offer.supplierOrganizationId !== supplier?.organization?.id) {
      throw new ForbiddenException({ message: 'Нет прав' });
    }
    if (offer.status !== OfferStatus.ACTIVE) {
      throw new BadRequestException({
        message: 'Нельзя редактировать неактивный отклик',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    const currentVersion = offer.versions[0];
    if (!currentVersion) {
      throw new BadRequestException({ message: 'Нет активной версии отклика' });
    }
    const newVersionNumber = currentVersion.versionNumber + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.offerVersion.create({
        data: {
          offerId,
          versionNumber: newVersionNumber,
          pricePerUnitMinor: dto.pricePerUnitMinor ?? currentVersion.pricePerUnitMinor,
          snapshotQuantity: currentVersion.snapshotQuantity,
          goodsTotalMinor: dto.goodsTotalMinor ?? currentVersion.goodsTotalMinor,
          deliveryCostMinor: dto.deliveryCostMinor ?? currentVersion.deliveryCostMinor,
          grandTotalMinor: dto.grandTotalMinor ?? currentVersion.grandTotalMinor,
          deliveryDays: dto.deliveryDays ?? currentVersion.deliveryDays,
          departureRegion:
            dto.departureRegion !== undefined
              ? dto.departureRegion
              : currentVersion.departureRegion,
          departureDistrict:
            dto.departureDistrict !== undefined
              ? dto.departureDistrict
              : currentVersion.departureDistrict,
          departureCity:
            dto.departureCity !== undefined ? dto.departureCity : currentVersion.departureCity,
          departureLat:
            dto.departureLat !== undefined ? dto.departureLat : currentVersion.departureLat,
          departureLng:
            dto.departureLng !== undefined ? dto.departureLng : currentVersion.departureLng,
          brandModel: dto.brandModel ?? currentVersion.brandModel,
          comment: dto.comment ?? currentVersion.comment,
          vatStatus: dto.vatStatus ?? currentVersion.vatStatus,
          paymentTerms: dto.paymentTerms ?? currentVersion.paymentTerms,
          confirmations: (dto.confirmations ?? currentVersion.confirmations) as any,
        },
      });

      return tx.offer.update({
        where: { id: offerId },
        data: { currentVersionId: newVersion.id },
        include: { versions: { where: { id: newVersion.id } } },
      });
    });

    return result;
  }

  async withdrawOffer(supplierId: string, offerId: string) {
    const supplier = await this.prisma.user.findUnique({
      where: { id: supplierId },
      include: { organization: true },
    });
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });

    if (!offer || offer.supplierOrganizationId !== supplier?.organization?.id) {
      throw new NotFoundException({ message: 'Отклик не найден' });
    }

    if (offer.status !== OfferStatus.ACTIVE) {
      throw new BadRequestException({
        message: 'Нельзя отозвать неактивный отклик',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    return this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.WITHDRAWN },
    });
  }

  async acceptOffer(buyerId: string, offerId: string, idempotencyKey: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        supplierOrganization: { include: { owner: true } },
      },
    });

    if (!offer) throw new NotFoundException({ message: 'Отклик не найден' });

    const order = await this.prisma.order.findUnique({
      where: { id: offer.orderId },
      include: { buyer: { include: { organization: true } } },
    });

    if (!order || order.buyerId !== buyerId) {
      throw new ForbiddenException({ message: 'Нет прав', code: ErrorCode.FORBIDDEN });
    }

    if (
      order.status !== OrderStatus.PUBLISHED ||
      offer.status !== OfferStatus.ACTIVE ||
      !offer.versions[0]
    ) {
      throw new BadRequestException({
        message: 'Нельзя принять отклик',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const orderUpdate = await tx.order.updateMany({
          where: { id: order.id, version: order.version, status: OrderStatus.PUBLISHED },
          data: {
            status: OrderStatus.CLOSED_ACCEPTED,
            acceptedOfferId: offer.id,
            closedAt: new Date(),
            version: { increment: 1 },
          },
        });

        if (orderUpdate.count === 0) {
          throw new ConflictException({
            message: 'Заказ уже закрыт',
            code: ErrorCode.ORDER_ALREADY_CLOSED,
          });
        }

        await tx.offer.update({
          where: { id: offer.id },
          data: { status: OfferStatus.ACCEPTED },
        });

        await tx.offer.updateMany({
          where: { orderId: order.id, id: { not: offer.id }, status: OfferStatus.ACTIVE },
          data: { status: OfferStatus.REJECTED },
        });

        const buyerProfile = { ...order.buyer.organization };
        const supplierProfile = { ...offer.supplierOrganization };
        const { contacts: buyerContact, ...safeBuyer } = buyerProfile as any;
        const { contacts: supplierContact, ...safeSupplier } = supplierProfile as any;

        const offerVersionSnapshotData = offer.versions[0] as any;
        const snapshot = await tx.acceptedOfferSnapshot.create({
          data: {
            orderId: order.id,
            offerId: offer.id,
            buyerOrganizationId: order.buyer.organization!.id,
            supplierOrganizationId: offer.supplierOrganizationId,
            orderSnapshot: order as any,
            offerVersionSnapshot: offerVersionSnapshotData,
            buyerPublicProfile: safeBuyer,
            supplierPublicProfile: safeSupplier,
            buyerContact: buyerContact || {},
            supplierContact: supplierContact || {},
            commercialTerms: { price: offerVersionSnapshotData.grandTotalMinor },
          },
        });

        await tx.contactDisclosure.create({
          data: {
            orderId: order.id,
            buyerUserId: order.buyerId,
            supplierUserId: offer.supplierOrganization.ownerUserId,
            reason: ContactDisclosureReason.OFFER_ACCEPTED,
          },
        });

        return { orderId: order.id, offerId: offer.id, status: OfferStatus.ACCEPTED };
      });
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          message: 'Сделка уже оформлена',
          code: ErrorCode.IDEMPOTENCY_CONFLICT,
        });
      }
      throw error;
    }
  }

  async getOffersForOrder(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== buyerId) throw new ForbiddenException();

    const offers = await this.prisma.offer.findMany({
      where: { orderId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        supplierOrganization: true,
      },
    });

    return offers.map((offer) => this.mapOfferToPublicDto(offer));
  }

  async getMyOffers(supplierUserId: string) {
    const supplier = await this.prisma.user.findUnique({
      where: { id: supplierUserId },
      include: { organization: true },
    });
    if (!supplier?.organization) return [];

    return this.prisma.offer.findMany({
      where: { supplierOrganizationId: supplier.organization.id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        order: { select: { title: true, status: true, id: true } },
      },
    });
  }

  async getOfferById(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!offer) throw new NotFoundException();
    return offer;
  }

  private mapOfferToPublicDto(offer: any) {
    const { supplierOrganization, ...offerData } = offer;
    let publicSupplier = null;

    if (supplierOrganization) {
      publicSupplier = {
        id: supplierOrganization.id,
        legalType: supplierOrganization.legalType,
        cityId: supplierOrganization.cityId,
        verificationStatus: supplierOrganization.verificationStatus,
        vatPayerStatus: supplierOrganization.vatPayerStatus,
        publicAlias: supplierOrganization.publicAlias,
        businessStartedAt: supplierOrganization.businessStartedAt,
      };
    }

    return { ...offerData, supplier: publicSupplier };
  }
}
