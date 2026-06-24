import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilesService } from '../files.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AntivirusStatus, FileVisibility, OrderStatus } from '@prisma/client';

// Mock getSignedUrl so it doesn't throw on undefined credentials
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mocked-presigned-url.com'),
}));

// Mock AWS S3 SDK commands to avoid actual requests
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({})),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

describe('FilesService', () => {
  let service: FilesService;
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      fileObject: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    } as any;

    // Reset process.env for predictability
    process.env.S3_ACCESS_KEY = 'mock';
    process.env.S3_SECRET_KEY = 'mock';
    process.env.S3_ENDPOINT = 'http://localhost:9000';

    service = new FilesService(prismaService);
  });

  describe('createUploadIntent', () => {
    it('should create a file record and return a presigned url', async () => {
      vi.mocked(prismaService.fileObject.create).mockResolvedValue({ id: 'f-1' } as any);

      const result = await service.createUploadIntent('u-1', 'test.pdf', 'application/pdf', 1024);

      expect(prismaService.fileObject.create).toHaveBeenCalled();
      expect(result.fileId).toBe('f-1');
      expect(result.uploadUrl).toBe('https://mocked-presigned-url.com');
    });
  });

  describe('completeUpload', () => {
    it('should throw NotFound if file not found', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue(null);
      await expect(service.completeUpload('u-1', 'f-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden if user is not owner', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({
        ownerUserId: 'u-2',
      } as any);
      await expect(service.completeUpload('u-1', 'f-1')).rejects.toThrow(ForbiddenException);
    });

    it('should update antivirus status to CLEAN', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({
        ownerUserId: 'u-1',
      } as any);
      vi.mocked(prismaService.fileObject.update).mockResolvedValue({
        id: 'f-1',
        antivirusStatus: AntivirusStatus.CLEAN,
      } as any);

      const result = await service.completeUpload('u-1', 'f-1');
      expect(result.antivirusStatus).toBe(AntivirusStatus.CLEAN);
      expect(prismaService.fileObject.update).toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    it('should throw NotFound if file does not exist', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue(null);
      await expect(service.getDownloadUrl('u-1', 'f-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden if user does not have access', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({
        ownerUserId: 'u-2',
        attachments: [],
      } as any);

      await expect(service.getDownloadUrl('u-1', 'f-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to download', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({
        ownerUserId: 'u-1',
        attachments: [],
        storageKey: 'key',
      } as any);

      const result = await service.getDownloadUrl('u-1', 'f-1');
      expect(result.downloadUrl).toBe('https://mocked-presigned-url.com');
    });

    it('should allow supplier to download if attached as SUPPLIERS_VISIBLE and order is PUBLISHED', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({
        ownerUserId: 'u-2',
        storageKey: 'key',
        attachments: [
          {
            visibility: FileVisibility.SUPPLIERS_VISIBLE,
            order: { status: OrderStatus.PUBLISHED },
          },
        ],
      } as any);

      vi.mocked(prismaService.user.findUnique).mockResolvedValue({
        id: 'u-1',
        organization: { id: 'org-1' },
      } as any);

      const result = await service.getDownloadUrl('u-1', 'f-1');
      expect(result.downloadUrl).toBe('https://mocked-presigned-url.com');
    });

    it('should throw Forbidden if attached as OWNER_ONLY_AI_SOURCE', async () => {
      vi.mocked(prismaService.fileObject.findUnique).mockResolvedValue({
        ownerUserId: 'u-2',
        storageKey: 'key',
        attachments: [
          {
            visibility: FileVisibility.OWNER_ONLY_AI_SOURCE,
            order: { status: OrderStatus.PUBLISHED },
          },
        ],
      } as any);

      vi.mocked(prismaService.user.findUnique).mockResolvedValue({
        id: 'u-1',
        organization: { id: 'org-1' },
      } as any);

      await expect(service.getDownloadUrl('u-1', 'f-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
