import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RatingsService } from '../ratings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

describe('RatingsService', () => {
  let service: RatingsService;
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      order: {
        findUnique: vi.fn(),
      },
      contactDisclosure: {
        findUnique: vi.fn(),
      },
      rating: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    } as any;

    service = new RatingsService(prismaService);
  });

  describe('createRating', () => {
    it('should throw BadRequest if rating self', async () => {
      await expect(service.createRating('u-1', { targetUserId: 'u-1', targetOrderId: 'o-1', score: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest if order not found', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue(null);
      await expect(service.createRating('u-1', { targetUserId: 'u-2', targetOrderId: 'o-1', score: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest if order is not CLOSED_ACCEPTED', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({ status: OrderStatus.PUBLISHED } as any);
      await expect(service.createRating('u-1', { targetUserId: 'u-2', targetOrderId: 'o-1', score: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw Forbidden if disclosure not found', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({ 
        status: OrderStatus.CLOSED_ACCEPTED, 
        buyerId: 'u-1',
        snapshots: [{}]
      } as any);
      vi.mocked(prismaService.contactDisclosure.findUnique).mockResolvedValue(null);

      await expect(service.createRating('u-1', { targetUserId: 'u-2', targetOrderId: 'o-1', score: 5 })).rejects.toThrow(ForbiddenException);
    });

    it('should create rating if everything is valid', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({ 
        id: 'o-1',
        status: OrderStatus.CLOSED_ACCEPTED, 
        buyerId: 'u-1',
        snapshots: [{}]
      } as any);
      vi.mocked(prismaService.contactDisclosure.findUnique).mockResolvedValue({ id: 'd-1' } as any);
      vi.mocked(prismaService.rating.create).mockResolvedValue({ id: 'r-1' } as any);

      const result = await service.createRating('u-1', { targetUserId: 'u-2', targetOrderId: 'o-1', score: 5, comment: 'Good' });
      
      expect(result.id).toBe('r-1');
      expect(prismaService.rating.create).toHaveBeenCalledWith({
        data: {
          authorUserId: 'u-1',
          targetUserId: 'u-2',
          targetOrderId: 'o-1',
          score: 5,
          comment: 'Good',
        }
      });
    });

    it('should handle unique constraint conflict', async () => {
      vi.mocked(prismaService.order.findUnique).mockResolvedValue({ 
        status: OrderStatus.CLOSED_ACCEPTED, 
        buyerId: 'u-1',
        snapshots: [{}]
      } as any);
      vi.mocked(prismaService.contactDisclosure.findUnique).mockResolvedValue({ id: 'd-1' } as any);
      vi.mocked(prismaService.rating.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '' })
      );

      await expect(service.createRating('u-1', { targetUserId: 'u-2', targetOrderId: 'o-1', score: 5 })).rejects.toThrow(ConflictException);
    });
  });
});
