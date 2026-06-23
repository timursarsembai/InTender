import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletsService } from '../wallets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletTransactionType, TransactionDirection, Prisma } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ErrorCode } from '@intender/shared';

describe('WalletsService', () => {
  let service: WalletsService;
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      wallet: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      walletTransaction: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    } as any;

    service = new WalletsService(prismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWallet', () => {
    it('should return existing wallet', async () => {
      const mockWallet = { id: 'w-1', userId: 'u-1', availableBalanceMinor: 1000, version: 1 };
      vi.mocked(prismaService.wallet.findUnique).mockResolvedValue(mockWallet as any);

      const result = await service.getWallet('u-1');
      expect(result).toEqual(mockWallet);
      expect(prismaService.wallet.create).not.toHaveBeenCalled();
    });

    it('should create new wallet if not exists', async () => {
      vi.mocked(prismaService.wallet.findUnique).mockResolvedValue(null);
      const newWallet = { id: 'w-1', userId: 'u-1', availableBalanceMinor: 0, version: 1 };
      vi.mocked(prismaService.wallet.create).mockResolvedValue(newWallet as any);

      const result = await service.getWallet('u-1');
      expect(result).toEqual(newWallet);
      expect(prismaService.wallet.create).toHaveBeenCalledWith({
        data: { userId: 'u-1', availableBalanceMinor: 0 },
      });
    });
  });

  describe('charge', () => {
    const mockWallet = { id: 'w-1', userId: 'u-1', availableBalanceMinor: 1000, version: 1 };

    it('should throw BadRequestException if insufficient balance', async () => {
      vi.mocked(prismaService.wallet.findUnique).mockResolvedValue(mockWallet as any);

      await expect(
        service.charge('u-1', 1500, WalletTransactionType.ORDER_PUBLICATION, 'key-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should execute transaction and return tx record', async () => {
      vi.mocked(prismaService.wallet.findUnique).mockResolvedValue(mockWallet as any);

      const mockTxResult = { id: 'tx-1', amountMinor: 500, balanceAfterMinor: 500 };
      vi.mocked(prismaService.$transaction).mockImplementation(async (cb) => {
        const txMock = {
          wallet: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          walletTransaction: {
            create: vi.fn().mockResolvedValue(mockTxResult),
          },
        };
        return cb(txMock as any);
      });

      const result = await service.charge('u-1', 500, WalletTransactionType.ORDER_PUBLICATION, 'key-1');
      expect(result).toEqual(mockTxResult);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate idempotency key (P2002)', async () => {
      vi.mocked(prismaService.wallet.findUnique).mockResolvedValue(mockWallet as any);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.x',
        meta: { target: ['idempotencyKey'] },
      });

      vi.mocked(prismaService.$transaction).mockRejectedValue(prismaError);

      await expect(
        service.charge('u-1', 500, WalletTransactionType.ORDER_PUBLICATION, 'key-2')
      ).rejects.toMatchObject({
        response: { code: ErrorCode.IDEMPOTENCY_CONFLICT },
      });
    });

    it('should retry on OCC conflict and eventually throw CONCURRENCY_CONFLICT if always fails', async () => {
      vi.mocked(prismaService.wallet.findUnique).mockResolvedValue(mockWallet as any);

      vi.mocked(prismaService.$transaction).mockImplementation(async (cb) => {
        const txMock = {
          wallet: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }), // count 0 means OCC failed
          },
        };
        return cb(txMock as any);
      });

      await expect(
        service.charge('u-1', 500, WalletTransactionType.ORDER_PUBLICATION, 'key-3')
      ).rejects.toMatchObject({
        response: { code: 'CONCURRENCY_CONFLICT' },
      });
    });
  });
});
