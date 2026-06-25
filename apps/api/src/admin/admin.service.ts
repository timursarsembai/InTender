import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { AuditService } from '../audit/audit.service';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Prisma, WalletTransactionType, ComplaintStatus, UserRole } from '@prisma/client';
import { ErrorCode } from '@intender/shared';

const CONFIG_KEYS = {
  aiProvider: 'ai.provider',
  deepseekApiKey: 'ai.deepseek.apiKey',
  deepseekModel: 'ai.deepseek.model',
  anthropicApiKey: 'ai.anthropic.apiKey',
  anthropicModel: 'ai.anthropic.model',
  geminiApiKey: 'ai.gemini.apiKey',
  geminiModel: 'ai.gemini.model',
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
  ) {}

  async getUsers(skip = 0, take = 50, search?: string) {
    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : undefined;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          organization: { select: { legalName: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async setUserRole(adminId: string, userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Нельзя изменить роль администратора');
    }
    if (role === UserRole.ADMIN) {
      throw new ForbiddenException('Нельзя назначить роль администратора через этот эндпоинт');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    await this.auditService.logAction(adminId, 'SET_USER_ROLE', 'USER', userId, { role });

    return updated;
  }

  async impersonateUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Нельзя войти в аккаунт другого администратора');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, impersonatedBy: adminId };
    const access_token = this.jwtService.sign(payload);

    await this.auditService.logAction(adminId, 'ADMIN_IMPERSONATE', 'USER', userId, {});

    return { access_token, user: { id: user.id, email: user.email, role: user.role } };
  }

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

    const executeResolution = async (tx: Prisma.TransactionClient): Promise<void> => {
      if (dto.blockTargetUserStatus && complaint.targetUserId) {
        await tx.user.update({
          where: { id: complaint.targetUserId },
          data: { status: dto.blockTargetUserStatus },
        });
      }

      await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: dto.status,
          resolution: dto.resolution,
          resolvedByUserId: adminId,
        },
      });

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

  async getConfig() {
    const rows = await this.prisma.appConfig.findMany({
      where: { key: { in: Object.values(CONFIG_KEYS) } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
      aiProvider: map[CONFIG_KEYS.aiProvider] ?? process.env.AI_PROVIDER ?? 'deepseek',
      deepseekApiKeySet: !!map[CONFIG_KEYS.deepseekApiKey],
      deepseekModel: map[CONFIG_KEYS.deepseekModel] ?? 'deepseek-chat',
      anthropicApiKeySet: !!map[CONFIG_KEYS.anthropicApiKey],
      anthropicModel: map[CONFIG_KEYS.anthropicModel] ?? 'claude-sonnet-4-6',
      geminiApiKeySet: !!map[CONFIG_KEYS.geminiApiKey],
      geminiModel: map[CONFIG_KEYS.geminiModel] ?? 'gemini-2.0-flash',
    };
  }

  async updateConfig(dto: UpdateConfigDto) {
    const updates: { key: string; value: string }[] = [];

    if (dto.aiProvider) updates.push({ key: CONFIG_KEYS.aiProvider, value: dto.aiProvider });
    if (dto.deepseekApiKey) updates.push({ key: CONFIG_KEYS.deepseekApiKey, value: dto.deepseekApiKey });
    if (dto.deepseekModel) updates.push({ key: CONFIG_KEYS.deepseekModel, value: dto.deepseekModel });
    if (dto.anthropicApiKey) updates.push({ key: CONFIG_KEYS.anthropicApiKey, value: dto.anthropicApiKey });
    if (dto.anthropicModel) updates.push({ key: CONFIG_KEYS.anthropicModel, value: dto.anthropicModel });
    if (dto.geminiApiKey) updates.push({ key: CONFIG_KEYS.geminiApiKey, value: dto.geminiApiKey });
    if (dto.geminiModel) updates.push({ key: CONFIG_KEYS.geminiModel, value: dto.geminiModel });

    await Promise.all(
      updates.map((u) =>
        this.prisma.appConfig.upsert({
          where: { key: u.key },
          create: u,
          update: { value: u.value },
        }),
      ),
    );

    return this.getConfig();
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
