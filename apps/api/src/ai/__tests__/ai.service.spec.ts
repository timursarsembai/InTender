import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiService } from '../ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletsService } from '../../wallets/wallets.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AiSpecJobStatus, WalletTransactionType } from '@prisma/client';
import { ErrorCode } from '@intender/shared';

describe('AiService', () => {
  let service: AiService;
  let prismaService: PrismaService;
  let walletsService: WalletsService;

  beforeEach(() => {
    prismaService = {
      fileObject: {
        findUnique: vi.fn(),
      },
      aiSpecJob: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    } as any;

    walletsService = {
      charge: vi.fn(),
    } as any;

    service = new AiService(prismaService, walletsService);

    // Mock processJobAsync internally to avoid test hanging or running actual timeout
    vi.spyOn(service as any, 'processJobAsync').mockResolvedValue(undefined);
  });

  describe('createJob', () => {
    it('should throw NotFound if file does not exist', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue(null);
      await expect(service.createJob('u-1', 'f-1', 'key')).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden if user does not own file', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({ ownerUserId: 'u-2' } as any);
      await expect(service.createJob('u-1', 'f-1', 'key')).rejects.toThrow(ForbiddenException);
    });

    it('should charge 1000 KZT and create job in transaction', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({ ownerUserId: 'u-1' } as any);

      vi.mocked(walletsService.charge).mockImplementation(async (userId, amount, type, key, refId, action) => {
        if (action) {
          const txMock = {
            aiSpecJob: {
              create: vi.fn().mockResolvedValue({ id: 'job-1' }),
            },
          };
          await action(txMock as any);
        }
        return { id: 'tx-1' };
      });

      const result = await service.createJob('u-1', 'f-1', 'key');
      expect(walletsService.charge).toHaveBeenCalledWith('u-1', 100000, WalletTransactionType.AI_SPEC_ANALYSIS, 'key', 'f-1', expect.any(Function));
      expect(result).toBeDefined();
      expect((service as any).processJobAsync).toHaveBeenCalled();
    });

    it('should return existing job on idempotency conflict', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({ ownerUserId: 'u-1' } as any);

      vi.mocked(walletsService.charge).mockImplementation(async () => {
        throw new ConflictException({ code: ErrorCode.IDEMPOTENCY_CONFLICT });
      });

      vi.mocked(prismaService.aiSpecJob.findFirst).mockResolvedValue({ id: 'job-1' } as any);

      const result = await service.createJob('u-1', 'f-1', 'key');
      expect(result.id).toBe('job-1');
    });
  });

  describe('getJob', () => {
    it('should throw NotFound if job does not exist', async () => {
      vi.mocked(prismaService.aiSpecJob.findUnique).mockResolvedValue(null);
      await expect(service.getJob('u-1', 'job-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden if user is not owner', async () => {
      vi.mocked(prismaService.aiSpecJob.findUnique).mockResolvedValue({ userId: 'u-2' } as any);
      await expect(service.getJob('u-1', 'job-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return job if user is owner', async () => {
      vi.mocked(prismaService.aiSpecJob.findUnique).mockResolvedValue({ userId: 'u-1', id: 'job-1' } as any);
      const result = await service.getJob('u-1', 'job-1');
      expect(result.id).toBe('job-1');
    });
  });
});
