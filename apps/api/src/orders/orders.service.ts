import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { OrderStatus, Prisma, WalletTransactionType } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ErrorCode } from '@intender/shared';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService
  ) {}

  async createDraft(buyerId: string, dto: CreateOrderDto) {
    const { attachments, ...orderData } = dto;
    return this.prisma.order.create({
      data: {
        ...orderData,
        buyerId,
        status: OrderStatus.DRAFT,
        attachments: attachments ? {
          create: attachments.map(a => ({
            fileId: a.fileId,
            visibility: a.visibility,
          })),
        } : undefined,
      },
    });
  }

  async updateDraft(buyerId: string, id: string, dto: UpdateOrderDto) {
    const order = await this.getOrderIfOwner(id, buyerId);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException({
        message: 'Редактировать можно только черновик',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    const { attachments, ...orderData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (attachments) {
        // Простой подход: удаляем старые и создаем новые
        await tx.orderAttachment.deleteMany({ where: { orderId: id } });
      }

      return tx.order.update({
        where: { id },
        data: {
          ...orderData,
          version: { increment: 1 },
          attachments: attachments ? {
            create: attachments.map(a => ({
              fileId: a.fileId,
              visibility: a.visibility,
            })),
          } : undefined,
        },
      });
    });
  }

  async publish(buyerId: string, id: string, idempotencyKey: string) {
    const order = await this.getOrderIfOwner(id, buyerId);

    if (order.status === OrderStatus.PUBLISHED) {
      // Идемпотентность: если уже опубликовано, возвращаем как есть
      return order;
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException({
        message: 'Опубликовать можно только черновик',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    // Стоимость публикации - 50 ₸ (5000 тиын)
    const PUBLICATION_FEE_MINOR = 5000;

    try {
      await this.walletsService.charge(
        buyerId,
        PUBLICATION_FEE_MINOR,
        WalletTransactionType.ORDER_PUBLICATION,
        idempotencyKey,
        order.id,
        async (tx) => {
          // Выполнится внутри транзакции списания
          const updateResult = await tx.order.updateMany({
            where: {
              id: order.id,
              version: order.version,
              status: OrderStatus.DRAFT,
            },
            data: {
              status: OrderStatus.PUBLISHED,
              publishedAt: new Date(),
              version: { increment: 1 },
            },
          });

          if (updateResult.count === 0) {
            throw new ConflictException({
              message: 'Конфликт обновления заказа, попробуйте снова',
              code: 'CONCURRENCY_CONFLICT',
            });
          }
        }
      );
    } catch (error) {
      // Проверка на дубликат idempotencyKey
      if (error instanceof ConflictException && (error.getResponse() as any).code === ErrorCode.IDEMPOTENCY_CONFLICT) {
        // Проверяем, может быть статус уже PUBLISHED (например, прошлый запрос успешен, но клиент не получил ответ)
        const updatedOrder = await this.prisma.order.findUnique({ where: { id } });
        if (updatedOrder?.status === OrderStatus.PUBLISHED) {
          return updatedOrder;
        }
      }
      throw error;
    }

    return this.prisma.order.findUnique({ where: { id } });
  }

  async cancel(buyerId: string, id: string) {
    const order = await this.getOrderIfOwner(id, buyerId);

    if (order.status === OrderStatus.CANCELLED) return order;

    const cancelableStatuses: OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.PUBLISHED];
    if (!cancelableStatuses.includes(order.status)) {
      throw new BadRequestException({
        message: 'Нельзя отменить заказ в текущем статусе',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        version: { increment: 1 },
      },
    });
  }

  async closeWithoutSelection(buyerId: string, id: string) {
    const order = await this.getOrderIfOwner(id, buyerId);

    if (order.status !== OrderStatus.PUBLISHED) {
      throw new BadRequestException({
        message: 'Закрыть можно только опубликованный заказ',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CLOSED_WITHOUT_SELECTION,
        closedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: {
          include: {
            organization: true,
          },
        },
        attachments: {
          include: {
            file: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        message: 'Заказ не найден',
        code: ErrorCode.RESOURCE_NOT_FOUND,
      });
    }

    return this.mapToPublicDto(order);
  }

  async getPublishedOrders(skip = 0, take = 20) {
    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      skip,
      take,
      include: {
        buyer: {
          include: {
            organization: true,
          },
        },
        attachments: {
          include: {
            file: true,
          },
        },
      },
    });

    return orders.map((o) => this.mapToPublicDto(o));
  }

  async getMyOrders(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: { attachments: { include: { file: true } } },
    });
  }

  async repeatOrder(buyerId: string, id: string) {
    const oldOrder = await this.getOrderIfOwner(id, buyerId);

    // Копируем поля в новый DRAFT
    const { id: _, version: __, status: ___, createdAt, updatedAt, publishedAt, closedAt, acceptedOfferId, attachments, ...dataToCopy } = oldOrder as any;

    return this.prisma.order.create({
      data: {
        ...dataToCopy,
        buyerId,
        status: OrderStatus.DRAFT,
        attachments: attachments ? {
          create: attachments.map((a: any) => ({ fileId: a.fileId, visibility: a.visibility })),
        } : undefined,
      },
    });
  }

  private async getOrderIfOwner(id: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { attachments: true } });
    if (!order) {
      throw new NotFoundException({
        message: 'Заказ не найден',
        code: ErrorCode.RESOURCE_NOT_FOUND,
      });
    }
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        message: 'Нет прав',
        code: ErrorCode.FORBIDDEN,
      });
    }
    return order;
  }

  async getDisclosedContacts(userId: string, orderId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user?.organization) {
      throw new ForbiddenException({ message: 'Только организации имеют доступ к контактам' });
    }

    // Ищем запись о раскрытии контактов, где текущий пользователь является либо покупателем, либо поставщиком
    const disclosure = await this.prisma.contactDisclosure.findFirst({
      where: {
        orderId,
        OR: [
          { buyerUserId: userId },
          { supplierUserId: userId },
        ],
      },
    });

    if (!disclosure) {
      throw new ForbiddenException({
        message: 'Контакты не раскрыты для этой сделки',
        code: ErrorCode.FORBIDDEN,
      });
    }

    // Retrieve snapshot manually since there's no DB relation
    const snapshot = await this.prisma.acceptedOfferSnapshot.findFirst({
      where: { orderId },
    });

    if (!snapshot) {
      throw new NotFoundException({ message: 'Снимок сделки не найден', code: ErrorCode.RESOURCE_NOT_FOUND });
    }

    const buyerOrg = await this.prisma.organization.findUnique({ 
      where: { id: snapshot.buyerOrganizationId },
      include: { owner: true }
    });
    const supplierOrg = await this.prisma.organization.findUnique({ 
      where: { id: snapshot.supplierOrganizationId },
      include: { owner: true }
    });

    const buyerContact = (buyerOrg?.contacts as any) || snapshot.buyerContact || {};
    if (!buyerContact.email && buyerOrg?.owner?.email) {
      buyerContact.email = buyerOrg.owner.email;
    }

    const supplierContact = (supplierOrg?.contacts as any) || snapshot.supplierContact || {};
    if (!supplierContact.email && supplierOrg?.owner?.email) {
      supplierContact.email = supplierOrg.owner.email;
    }

    const buyerProfile = snapshot.buyerPublicProfile as any;
    const supplierProfile = snapshot.supplierPublicProfile as any;

    return {
      buyerContacts: buyerContact,
      supplierContacts: supplierContact,
      buyerBin: buyerProfile.bin,
      supplierBin: supplierProfile.bin,
      buyerLegalName: buyerProfile.legalName,
      supplierLegalName: supplierProfile.legalName,
      buyerLegalType: buyerProfile.legalType,
      supplierLegalType: supplierProfile.legalType,
      buyerOrgId: snapshot.buyerOrganizationId,
      supplierOrgId: snapshot.supplierOrganizationId,
    };
  }

  private mapToPublicDto(order: any) {
    // Скрываем контакты и БИН покупателя для публичного отображения
    const { buyer, ...orderData } = order;
    let publicBuyer = null;

    if (buyer?.organization) {
      publicBuyer = {
        id: buyer.organization.id,
        legalType: buyer.organization.legalType,
        cityId: buyer.organization.cityId,
        verificationStatus: buyer.organization.verificationStatus,
        vatPayerStatus: buyer.organization.vatPayerStatus,
        publicAlias: buyer.organization.publicAlias,
        businessStartedAt: buyer.organization.businessStartedAt,
      };
    }

    return {
      ...orderData,
      buyer: publicBuyer,
    };
  }
}
