import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { AuditService } from '../audit/audit.service';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { WalletTransactionType, ComplaintStatus } from '@prisma/client';
import { ErrorCode } from '@intender/shared';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
    private readonly auditService: AuditService,
  ) {}

  async getComplaints(skip = 0, take = 20) {
    return this.prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        reporter: { select: { id: true, email: true } },
        targetUser: { select: { id: true, email: true } },
      },
    });
  }

  async resolveComplaint(adminId: string, complaintId: string, dto: ResolveComplaintDto) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Жалоба не найдена');

    if (complaint.status !== ComplaintStatus.PENDING) {
      throw new BadRequestException('Жалоба уже рассмотрена');
    }

    const executeResolution = async (tx: any) => {
      // 2. Блокировка пользователя
      if (dto.blockTargetUserStatus && complaint.targetUserId) {
        await tx.user.update({
          where: { id: complaint.targetUserId },
          data: { status: dto.blockTargetUserStatus },
        });
      }

      // 3. Обновление статуса жалобы
      const updatedComplaint = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: dto.status,
          resolution: dto.resolution,
          resolvedByUserId: adminId,
        },
      });

      // 4. Логирование
      await this.auditService.logAction(
        adminId,
        'RESOLVE_COMPLAINT',
        'COMPLAINT',
        complaintId,
        {
          resolution: dto.resolution,
          status: dto.status,
          refund: dto.refundAmountMinor,
          blocked: dto.blockTargetUserStatus,
        },
        tx,
      );

      return updatedComplaint;
    };

    try {
      if (dto.refundAmountMinor && dto.idempotencyKey) {
        await this.walletsService.charge(
          complaint.reporterUserId,
          dto.refundAmountMinor,
          WalletTransactionType.REFUND,
          dto.idempotencyKey,
          complaint.id,
          executeResolution,
        );
      } else {
        await this.prisma.$transaction(executeResolution);
      }

      return this.prisma.complaint.findUnique({ where: { id: complaintId } });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw error;
    }
  }

  async issueRefund(
    adminId: string,
    userId: string,
    amountMinor: number,
    idempotencyKey: string,
    reason: string,
  ) {
    await this.walletsService.charge(
      userId,
      amountMinor,
      WalletTransactionType.REFUND,
      idempotencyKey,
      undefined,
      async (tx) => {
        await this.auditService.logAction(
          adminId,
          'MANUAL_REFUND',
          'USER',
          userId,
          { amountMinor, reason, idempotencyKey },
          tx,
        );
      },
    );
    return { success: true };
  }

  async deleteRating(adminId: string, ratingId: string) {
    const rating = await this.prisma.rating.findUnique({ where: { id: ratingId } });
    if (!rating) throw new NotFoundException('Отзыв не найден');

    await this.prisma.$transaction(async (tx) => {
      await tx.rating.update({
        where: { id: ratingId },
        data: { isDeleted: true },
      });

      await this.auditService.logAction(
        adminId,
        'DELETE_RATING',
        'RATING',
        ratingId,
        { authorId: rating.authorUserId, targetId: rating.targetUserId, score: rating.score },
        tx,
      );
    });

    return { success: true };
  }
}
