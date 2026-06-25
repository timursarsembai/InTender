import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  /** Attaches a fresh presigned download URL to a message that carries a file. */
  private async withAttachment<T extends { attachmentFileId: string | null }>(message: T) {
    if (!message.attachmentFileId) return { ...message, attachment: null };
    const attachment = await this.filesService.presignChatAttachment(message.attachmentFileId);
    return { ...message, attachment };
  }

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

    const messages = await this.prisma.chatMessage.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });

    return Promise.all(messages.map((m) => this.withAttachment(m)));
  }

  async sendMessage(
    userId: string,
    roomId: string,
    content: string,
    attachmentFileId?: string,
  ) {
    const text = (content ?? '').trim();
    if (!text && !attachmentFileId) {
      throw new BadRequestException('Сообщение не может быть пустым');
    }

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

    // Attachment must belong to the sender (uploaded via files upload-intent).
    if (attachmentFileId) {
      const file = await this.prisma.fileObject.findUnique({ where: { id: attachmentFileId } });
      if (!file || file.ownerUserId !== userId) {
        throw new ForbiddenException('Файл недоступен');
      }
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderUserId: userId,
        content: text,
        attachmentFileId: attachmentFileId ?? null,
      },
      include: {
        sender: { select: { id: true, email: true, role: true } },
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return this.withAttachment(message);
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
