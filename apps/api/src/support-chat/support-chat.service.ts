import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class SupportChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async getOrCreateMyRoom(userId: string) {
    const existing = await this.prisma.supportChatRoom.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.supportChatRoom.create({ data: { userId } });
  }

  async getMyMessages(userId: string) {
    const room = await this.getOrCreateMyRoom(userId);
    const messages = await this.prisma.supportChatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, email: true, role: true } } },
    });
    return { room, messages: await Promise.all(messages.map((m) => this.withAttachment(m))) };
  }

  async sendMessage(userId: string, content: string, attachmentFileId?: string) {
    const room = await this.getOrCreateMyRoom(userId);

    if (attachmentFileId) {
      const file = await this.prisma.fileObject.findUnique({ where: { id: attachmentFileId } });
      if (!file || file.ownerUserId !== userId) {
        throw new ForbiddenException('Нет доступа к файлу');
      }
    }

    const message = await this.prisma.supportChatMessage.create({
      data: { roomId: room.id, senderUserId: userId, content, attachmentFileId },
      include: { sender: { select: { id: true, email: true, role: true } } },
    });

    return { roomId: room.id, message: await this.withAttachment(message) };
  }

  async getAllRooms(skip = 0, take = 50) {
    const [rooms, total] = await Promise.all([
      this.prisma.supportChatRoom.findMany({
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, email: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true },
          },
        },
      }),
      this.prisma.supportChatRoom.count(),
    ]);

    return { rooms, total };
  }

  async getRoomMessages(staffUserId: string, roomId: string) {
    await this.assertStaff(staffUserId);

    const room = await this.prisma.supportChatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Обращение не найдено');

    const messages = await this.prisma.supportChatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, email: true, role: true } } },
    });

    return { room, messages: await Promise.all(messages.map((m) => this.withAttachment(m))) };
  }

  async staffSendMessage(staffUserId: string, roomId: string, content: string, attachmentFileId?: string) {
    await this.assertStaff(staffUserId);

    const room = await this.prisma.supportChatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Обращение не найдено');

    if (attachmentFileId) {
      const file = await this.prisma.fileObject.findUnique({ where: { id: attachmentFileId } });
      if (!file || file.ownerUserId !== staffUserId) {
        throw new ForbiddenException('Нет доступа к файлу');
      }
    }

    const message = await this.prisma.supportChatMessage.create({
      data: { roomId, senderUserId: staffUserId, content, attachmentFileId },
      include: { sender: { select: { id: true, email: true, role: true } } },
    });

    await this.prisma.supportChatRoom.update({ where: { id: roomId }, data: {} });

    return await this.withAttachment(message);
  }

  private async assertStaff(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR)) {
      throw new ForbiddenException('Только для администраторов и модераторов');
    }
  }

  private async withAttachment<T extends { attachmentFileId: string | null }>(message: T) {
    if (!message.attachmentFileId) return { ...message, attachmentUrl: null };
    try {
      const result = await this.filesService.presignChatAttachment(message.attachmentFileId);
      return { ...message, attachmentUrl: result?.downloadUrl ?? null };
    } catch {
      return { ...message, attachmentUrl: null };
    }
  }
}
