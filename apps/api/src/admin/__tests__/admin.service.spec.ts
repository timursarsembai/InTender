import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletsService } from '../../wallets/wallets.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ComplaintStatus, UserStatus, WalletTransactionType } from '@prisma/client';
import { ErrorCode } from '@intender/shared';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: PrismaService;
  let walletsService: WalletsService;
  let auditService: AuditService;

  beforeEach(() => {
    prismaService = {
      complaint: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    } as any;

    walletsService = {
      charge: vi.fn(),
    } as any;

    auditService = {
      logAction: vi.fn(),
    } as any;

    service = new AdminService(prismaService, walletsService, auditService);
  });

  describe('resolveComplaint', () => {
    it('should throw NotFound if complaint does not exist', async () => {
      vi.mocked(prismaService.complaint.findUnique).mockResolvedValue(null);
      await expect(
        service.resolveComplaint('admin-1', 'c-1', {
          status: ComplaintStatus.RESOLVED,
          resolution: 'res',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if already resolved', async () => {
      vi.mocked(prismaService.complaint.findUnique).mockResolvedValue({
        status: ComplaintStatus.RESOLVED,
      } as any);
      await expect(
        service.resolveComplaint('admin-1', 'c-1', {
          status: ComplaintStatus.RESOLVED,
          resolution: 'res',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update complaint, issue refund, block user and log audit in transaction', async () => {
      vi.mocked(prismaService.complaint.findUnique).mockResolvedValue({
        id: 'c-1',
        status: ComplaintStatus.PENDING,
        reporterUserId: 'u-1',
        targetUserId: 'u-2',
      } as any);

      const executeResolutionMock = async () => {
        const txMock = {
          user: { update: vi.fn() },
          complaint: {
            update: vi.fn().mockResolvedValue({ id: 'c-1', status: ComplaintStatus.RESOLVED }),
          },
        };
        // call the callback mock
        await txMock.complaint.update();
        await txMock.user.update();
      };

      vi.mocked(walletsService.charge).mockImplementation(
        async (userId, amount, type, key, refId, action) => {
          if (action) {
            const txMock = {
              user: { update: vi.fn() },
              complaint: {
                update: vi.fn().mockResolvedValue({ id: 'c-1', status: ComplaintStatus.RESOLVED }),
              },
            };
            await action(txMock as any);
          }
          return { id: 'tx-1' };
        },
      );

      const result = await service.resolveComplaint('admin-1', 'c-1', {
        status: ComplaintStatus.RESOLVED,
        resolution: 'Banned user and refunded',
        refundAmountMinor: 5000,
        idempotencyKey: 'refund-key',
        blockTargetUserStatus: UserStatus.BLOCKED,
      });

      expect(walletsService.charge).toHaveBeenCalledWith(
        'u-1',
        5000,
        WalletTransactionType.REFUND,
        'refund-key',
        'c-1',
        expect.any(Function),
      );
      expect(auditService.logAction).toHaveBeenCalled();
    });
  });

  describe('issueRefund', () => {
    it('should issue manual refund and log audit', async () => {
      vi.mocked(walletsService.charge).mockImplementation(
        async (userId, amount, type, key, refId, action) => {
          if (action) {
            await action({} as any);
          }
          return { id: 'tx-1' };
        },
      );

      const result = await service.issueRefund('admin-1', 'u-1', 10000, 'key', 'Manual adjustment');

      expect(walletsService.charge).toHaveBeenCalledWith(
        'u-1',
        10000,
        WalletTransactionType.REFUND,
        'key',
        undefined,
        expect.any(Function),
      );
      expect(auditService.logAction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
