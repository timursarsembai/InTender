import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface HealthResponse {
  status: string;
}

interface ReadinessResponse {
  status: string;
  checks: {
    db: boolean;
    redis: boolean;
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health(): HealthResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<ReadinessResponse> {
    let dbOk = false;

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }

    // Redis readiness will be added when Redis module is introduced
    const redisOk = true;

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      checks: {
        db: dbOk,
        redis: redisOk,
      },
    };
  }
}
