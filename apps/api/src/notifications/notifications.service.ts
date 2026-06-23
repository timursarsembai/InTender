import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SendNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  payload?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(data: SendNotificationDto, tx?: any) {
    const prismaClient = tx || this.prisma;
    try {
      return await prismaClient.notification.create({
        data,
      });
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  async getMyNotifications(userId: string, skip = 0, take = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async markAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
