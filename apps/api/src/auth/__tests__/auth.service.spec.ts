import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, OrganizationLegalType } from '@intender/shared';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      createUser: vi.fn(),
    } as any;

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    } as any;

    prismaService = {
      $transaction: vi.fn((cb) =>
        cb({
          user: {
            create: vi
              .fn()
              .mockResolvedValue({ id: 'user-1', email: 'test@test.com', role: UserRole.BUYER }),
          },
          organization: { create: vi.fn() },
        }),
      ),
    } as any;

    service = new AuthService(usersService, jwtService, prismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user exists', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue({ id: '1' } as any);

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'password',
          role: UserRole.BUYER,
          legalType: OrganizationLegalType.TOO,
          legalName: 'Test',
          bin: '123456789012',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and organization and return token', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);

      const result = await service.register({
        email: 'test@test.com',
        password: 'password',
        role: UserRole.BUYER,
        legalType: OrganizationLegalType.TOO,
        legalName: 'Test',
        bin: '123456789012',
      });

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ access_token: 'mock-jwt-token' });
    });
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);
      const result = await service.validateUser('test@test.com', 'pass');
      expect(result).toBeNull();
    });

    it('should return user without passwordHash if password matches', async () => {
      const mockHash = await bcrypt.hash('password', 10);
      vi.mocked(usersService.findByEmail).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: mockHash,
      } as any);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should return null if password does not match', async () => {
      const mockHash = await bcrypt.hash('password', 10);
      vi.mocked(usersService.findByEmail).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: mockHash,
      } as any);

      const result = await service.validateUser('test@test.com', 'wrong');
      expect(result).toBeNull();
    });
  });
});
