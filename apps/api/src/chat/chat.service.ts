import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getRoomsForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user || !user.organization) {
      return [];
    }

    const orgId = user.organization.id;
    return this.prisma.chatRoom.findMany({
      where: {
        OR: [{ buyerOrganizationId: orgId }, { supplierOrganizationId: orgId }],
      },
      include: {
        order: { select: { id: true, title: true } },
        buyerOrganization: { select: { id: true, legalName: true } },
        supplierOrganization: { select: { id: true, legalName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(roomId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user || !user.organization) throw new ForbiddenException();

    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Chat room not found');

    if (
      room.buyerOrganizationId !== user.organization.id &&
      room.supplierOrganizationId !== user.organization.id
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.chatMessage.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });
  }

  async sendMessage(userId: string, roomId: string, content: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user || !user.organization) throw new ForbiddenException();

    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Chat room not found');

    if (
      room.buyerOrganizationId !== user.organization.id &&
      room.supplierOrganizationId !== user.organization.id
    ) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderUserId: userId,
        content: content,
      },
      include: {
        sender: { select: { id: true, email: true, role: true } },
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async findOrCreateRoom(
    orderId: string,
    supplierOrganizationId: string,
    buyerOrganizationId: string,
  ) {
    let room = await this.prisma.chatRoom.findUnique({
      where: {
        orderId_buyerOrganizationId_supplierOrganizationId: {
          orderId,
          buyerOrganizationId,
          supplierOrganizationId,
        },
      },
    });

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          orderId,
          buyerOrganizationId,
          supplierOrganizationId,
        },
      });
    }

    return room;
  }
}
