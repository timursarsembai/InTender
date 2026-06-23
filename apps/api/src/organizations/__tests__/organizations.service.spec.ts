import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from '../organizations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationLegalType, VerificationStatus, VatPayerStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prismaService: PrismaService;

  const mockOrg = {
    id: 'test-org-id',
    ownerUserId: 'test-user-id',
    legalType: OrganizationLegalType.TOO,
    legalName: 'Test TOO',
    bin: '123456789012',
    cityId: 'city-1',
    businessStartedAt: new Date(),
    vatPayerStatus: VatPayerStatus.VAT_PAYER,
    verificationStatus: VerificationStatus.VERIFIED,
    publicAlias: 'Test Alias',
    contacts: { phone: '123' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      organization: {
        findUnique: vi.fn(),
      },
    } as any;

    service = new OrganizationsService(prismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicProfile', () => {
    it('should return public dto without bin and contacts', async () => {
      vi.mocked(prismaService.organization.findUnique).mockResolvedValue(mockOrg);

      const result = await service.getPublicProfile('test-org-id');
      
      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrg.id);
      expect(result.legalType).toBe(mockOrg.legalType);
      expect(result.verificationStatus).toBe(mockOrg.verificationStatus);
      expect((result as any).bin).toBeUndefined();
      expect((result as any).contacts).toBeUndefined();
      expect((result as any).legalName).toBeUndefined();
    });

    it('should throw NotFoundException if org not found', async () => {
      vi.mocked(prismaService.organization.findUnique).mockResolvedValue(null);

      await expect(service.getPublicProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
