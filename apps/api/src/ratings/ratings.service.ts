import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRating(authorUserId: string, dto: CreateRatingDto) {
    if (authorUserId === dto.targetUserId) {
      throw new BadRequestException('Нельзя оценить самого себя');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.targetOrderId },
      include: {
        snapshots: true, // to find supplier
      },
    });

    if (!order) throw new BadRequestException('Заказ не найден');
    if (order.status !== OrderStatus.CLOSED_ACCEPTED) {
      throw new BadRequestException('Можно оценивать только закрытые заказы');
    }

    const snapshot = order.snapshots[0];
    if (!snapshot) throw new BadRequestException('Снимок заказа не найден');

    // Проверяем, что автор и цель являются участниками сделки
    const isAuthorBuyer = order.buyerId === authorUserId;
    const isTargetBuyer = order.buyerId === dto.targetUserId;

    // Поставщик определяется из snapshot, но userId поставщика там не лежит напрямую в корне,
    // он в supplierPublicProfile или мы можем получить его через acceptedOffer.
    // Для безопасности мы можем сделать запрос к ContactDisclosure
    const disclosure = await this.prisma.contactDisclosure.findUnique({
      where: {
        orderId_buyerUserId_supplierUserId: {
          orderId: order.id,
          buyerUserId: order.buyerId,
          supplierUserId: isAuthorBuyer ? dto.targetUserId : authorUserId,
        },
      },
    });

    if (!disclosure) {
      throw new ForbiddenException(
        'Вы не являетесь участником этой сделки или контакты не были раскрыты',
      );
    }

    try {
      return await this.prisma.rating.create({
        data: {
          authorUserId,
          targetUserId: dto.targetUserId,
          targetOrderId: dto.targetOrderId,
          score: dto.score,
          comment: dto.comment,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Вы уже оставили отзыв к этому заказу');
      }
      throw error;
    }
  }

  async getUserRatings(userId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { targetUserId: userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, email: true } },
      },
    });

    const averageScore =
      ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;

    return {
      averageScore,
      totalCount: ratings.length,
      ratings,
    };
  }
}
