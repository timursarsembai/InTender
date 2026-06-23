import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    actorUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    payload?: any,
    tx?: any
  ) {
    const prismaClient = tx || this.prisma;
    
    try {
      await prismaClient.auditEvent.create({
        data: {
          actorUserId,
          action,
          targetType,
          targetId,
          payload,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to log audit event: ${error.message}`, error.stack);
      // We don't throw error to avoid failing the main business transaction just because of audit log failure,
      // but in strict systems you might want to throw.
    }
  }
}
