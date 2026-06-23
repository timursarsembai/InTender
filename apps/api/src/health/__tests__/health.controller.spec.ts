import { describe, it, expect, vi } from 'vitest';
import { HealthController } from '../health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  const mockPrisma = {
    $queryRawUnsafe: vi.fn(),
  } as unknown as PrismaService;

  const controller = new HealthController(mockPrisma);

  it('should return ok for liveness', () => {
    const result = controller.health();
    expect(result).toEqual({ status: 'ok' });
  });

  it('should return ok for readiness when DB is available', async () => {
    vi.mocked(mockPrisma.$queryRawUnsafe).mockResolvedValueOnce([{ '?column?': 1 }]);
    const result = await controller.ready();
    expect(result.status).toBe('ok');
    expect(result.checks.db).toBe(true);
  });

  it('should return degraded when DB is unavailable', async () => {
    vi.mocked(mockPrisma.$queryRawUnsafe).mockRejectedValueOnce(new Error('DB down'));
    const result = await controller.ready();
    expect(result.status).toBe('degraded');
    expect(result.checks.db).toBe(false);
  });
});
