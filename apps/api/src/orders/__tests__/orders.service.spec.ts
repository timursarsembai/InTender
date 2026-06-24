import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService } from '../orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletsService } from '../../wallets/wallets.service';
import { OrderStatus, LogisticsOption, VatOption } from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ErrorCode } from '@intender/shared';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let walletsService: WalletsService;

  beforeEach(() => {
    prismaService = {
      order: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    } as any;

    walletsService = {
      charge: vi.fn(),
    } as any;

    service = new OrdersService(prismaService, walletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDraft', () => {
    it('should create order in DRAFT status', async () => {
      const mockDto = {
        title: 'Test Order',
        quantity: 10,
        unit: 'шт',
        deliveryAddress: 'Almaty',
        deadline: new Date().toISOString(),
      };

      vi.mocked(prismaService.order.create).mockResolvedValue({
        id: 'o-1',
        ...mockDto,
        status: OrderStatus.DRAFT,
      } as any);

      const result = await service.createDraft('u-1', mockDto as any);
      expect(result.id).toBe('o-1');
      expect(prismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyerId: 'u-1',
            status: OrderStatus.DRAFT,
          }),
        }),
      );
    });
  });

  describe('publish', () => {
    const mockDraftOrder = { id: 'o-1', buyerId: 'u-1', status: OrderStatus.DRAFT, version: 1 };
    const mockPublishedOrder = {
      id: 'o-1',
      buyerId: 'u-1',
      status: OrderStatus.PUBLISHED,
      version: 2,
    };

    it('should throw NotFound if order does not exist', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue(null);
      await expect(service.publish('u-1', 'o-1', 'key')).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden if buyerId does not match', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({
        ...mockDraftOrder,
        buyerId: 'other',
      } as any);
      await expect(service.publish('u-1', 'o-1', 'key')).rejects.toThrow(ForbiddenException);
    });

    it('should return order if already published', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue(mockPublishedOrder as any);
      const result = await service.publish('u-1', 'o-1', 'key');
      expect(result).toEqual(mockPublishedOrder);
      expect(walletsService.charge).not.toHaveBeenCalled();
    });

    it('should throw BadRequest if status is not DRAFT', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({
        ...mockDraftOrder,
        status: OrderStatus.CANCELLED,
      } as any);
      await expect(service.publish('u-1', 'o-1', 'key')).rejects.toThrow(BadRequestException);
    });

    it('should call walletsService.charge and update status to PUBLISHED', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValueOnce(mockDraftOrder as any); // getOrderIfOwner
      vi.mocked(prismaService.order.findUnique).mockResolvedValueOnce(mockPublishedOrder as any); // return after update

      // Simulate charge calling the action callback
      vi.mocked(walletsService.charge).mockImplementation(
        async (userId, amount, type, key, refId, action) => {
          if (action) {
            const mockTx = {
              order: {
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
              },
            };
            await action(mockTx as any);
          }
          return { id: 'tx-1' };
        },
      );

      const result = await service.publish('u-1', 'o-1', 'key');
      expect(walletsService.charge).toHaveBeenCalled();
      expect(result).toEqual(mockPublishedOrder);
    });

    it('should return PUBLISHED order if IdempotencyConflict but order was already published', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValueOnce(mockDraftOrder as any); // getOrderIfOwner
      vi.mocked(prismaService.order.findUnique).mockResolvedValueOnce(mockPublishedOrder as any); // check status after conflict

      vi.mocked(walletsService.charge).mockRejectedValue(
        new ConflictException({ code: ErrorCode.IDEMPOTENCY_CONFLICT }),
      );

      const result = await service.publish('u-1', 'o-1', 'key');
      expect(result).toEqual(mockPublishedOrder);
    });
  });

  describe('mapToPublicDto', () => {
    it('should remove buyer private info', async () => {
      const mockOrder = {
        id: 'o-1',
        buyer: {
          organization: {
            id: 'org-1',
            legalType: 'TOO',
            publicAlias: 'Alias',
            bin: 'secret',
            contacts: 'secret',
          },
        },
      };

      vi.mocked(prismaService.order.findUnique).mockResolvedValue(mockOrder as any);

      const result = await service.getOrder('o-1');
      expect((result.buyer as any).bin).toBeUndefined();
      expect((result.buyer as any).contacts).toBeUndefined();
      expect(result.buyer.legalType).toBe('TOO');
      expect(result.buyer.publicAlias).toBe('Alias');
    });
  });
});
