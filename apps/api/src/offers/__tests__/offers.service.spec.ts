import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OffersService } from '../offers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletsService } from '../../wallets/wallets.service';
import { OrderStatus, OfferStatus, Prisma } from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ErrorCode } from '@intender/shared';

describe('OffersService', () => {
  let service: OffersService;
  let prismaService: PrismaService;
  let walletsService: WalletsService;

  beforeEach(() => {
    prismaService = {
      order: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      offer: {
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      offerVersion: {
        create: vi.fn(),
      },
      acceptedOfferSnapshot: {
        create: vi.fn(),
      },
      contactDisclosure: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    } as any;

    walletsService = {
      charge: vi.fn(),
    } as any;

    service = new OffersService(prismaService, walletsService);
  });

  describe('createOffer', () => {
    it('should throw BadRequest if order not PUBLISHED', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({
        status: OrderStatus.DRAFT,
      } as any);
      await expect(service.createOffer('s-1', 'o-1', {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw Forbidden if user is not organization', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({
        status: OrderStatus.PUBLISHED,
      } as any);
      vi.mocked(prismaService.user.findUnique).mockResolvedValue({ organization: null } as any);
      await expect(service.createOffer('s-1', 'o-1', {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should charge 50 and create offer', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({
        status: OrderStatus.PUBLISHED,
      } as any);
      vi.mocked(prismaService.user.findUnique).mockResolvedValue({
        organization: { id: 'org-1' },
      } as any);

      vi.mocked(walletsService.charge).mockImplementation(
        async (userId, amount, type, key, refId, action) => {
          if (action) {
            const txMock = {
              offer: {
                create: vi.fn().mockResolvedValue({ id: 'offer-1', versions: [{ id: 'v-1' }] }),
                update: vi.fn(),
              },
            };
            await action(txMock as any);
          }
          return { id: 'tx-1' };
        },
      );

      vi.mocked(prismaService.offer.findUnique).mockResolvedValue({ id: 'offer-1' } as any);

      const result = await service.createOffer('s-1', 'o-1', {
        idempotencyKey: 'key',
        confirmations: {},
      } as any);
      expect(walletsService.charge).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('acceptOffer', () => {
    it('should throw NotFound if offer does not exist', async () => {
      vi.mocked(prismaService.offer.findUnique).mockResolvedValue(null);
      await expect(service.acceptOffer('b-1', 'off-1', 'key')).rejects.toThrow(NotFoundException);
    });

    it('should update statuses and create snapshot and disclosure in tx', async () => {
      const mockOffer = {
        id: 'off-1',
        orderId: 'o-1',
        status: OfferStatus.ACTIVE,
        supplierOrganizationId: 'org-2',
        versions: [{ id: 'v-1' }],
        supplierOrganization: { ownerUserId: 's-1' },
      };
      const mockOrder = {
        id: 'o-1',
        buyerId: 'b-1',
        status: OrderStatus.PUBLISHED,
        buyer: { organization: { id: 'org-1' } },
        version: 1,
      };

      vi.mocked(prismaService.offer.findUnique).mockResolvedValue(mockOffer as any);
      vi.mocked(prismaService.order.findUnique).mockResolvedValue(mockOrder as any);

      vi.mocked(prismaService.$transaction).mockImplementation(async (cb) => {
        const txMock = {
          order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          offer: { update: vi.fn(), updateMany: vi.fn() },
          acceptedOfferSnapshot: { create: vi.fn().mockResolvedValue({ id: 'snap-1' }) },
          contactDisclosure: { create: vi.fn() },
        };
        return cb(txMock as any);
      });

      const result = await service.acceptOffer('b-1', 'off-1', 'key');
      expect(result).toEqual({ orderId: 'o-1', offerId: 'off-1', status: OfferStatus.ACCEPTED });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });
});
