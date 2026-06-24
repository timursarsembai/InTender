import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { AiSpecJobStatus, WalletTransactionType, Prisma } from '@prisma/client';
import { ErrorCode } from '@intender/shared';

const AI_SPEC_PRICE_MINOR = 100000; // 1000 KZT

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
  ) {}

  async createJob(userId: string, fileId: string, idempotencyKey: string) {
    const file = await this.prisma.fileObject.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException({ message: 'Файл не найден' });
    }
    if (file.ownerUserId !== userId) {
      throw new ForbiddenException({ message: 'Нет прав на этот файл' });
    }

    let job: any;

    try {
      await this.walletsService.charge(
        userId,
        AI_SPEC_PRICE_MINOR,
        WalletTransactionType.AI_SPEC_ANALYSIS,
        idempotencyKey,
        fileId,
        async (tx) => {
          job = await tx.aiSpecJob.create({
            data: {
              userId,
              sourceFileId: fileId,
              status: AiSpecJobStatus.PENDING,
              priceMinor: AI_SPEC_PRICE_MINOR,
            },
          });
        },
      );
    } catch (error) {
      if (
        error instanceof ConflictException &&
        (error.getResponse() as any).code === ErrorCode.IDEMPOTENCY_CONFLICT
      ) {
        // Find existing job if idempotency conflict
        const existingJob = await this.prisma.aiSpecJob.findFirst({
          where: { userId, sourceFileId: fileId },
          orderBy: { createdAt: 'desc' },
        });
        if (existingJob) return existingJob;
      }
      throw error;
    }

    // Запускаем асинхронную обработку
    this.processJobAsync(job.id, userId).catch((err) => {
      this.logger.error(`Error processing job ${job.id}: ${err.message}`, err.stack);
    });

    return job;
  }

  async getJob(userId: string, jobId: string) {
    const job = await this.prisma.aiSpecJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException({ message: 'Задача не найдена' });
    }
    if (job.userId !== userId) {
      throw new ForbiddenException({ message: 'Нет прав' });
    }
    return job;
  }

  private async processJobAsync(jobId: string, userId: string) {
    // 1. Переводим в PROCESSING
    await this.prisma.aiSpecJob.update({
      where: { id: jobId },
      data: { status: AiSpecJobStatus.PROCESSING },
    });

    try {
      // Имитируем задержку ИИ
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Для тестирования возврата средств: если файл называется "error.pdf", имитируем ошибку ИИ
      const job = await this.prisma.aiSpecJob.findUnique({
        where: { id: jobId },
        include: { sourceFile: true },
      });
      if (job?.sourceFile.originalName.includes('error')) {
        throw new Error('AI processing failed');
      }

      // Имитируем успешный результат
      const mockResult = {
        items: [
          {
            name: 'Ноутбук Apple MacBook Pro 14',
            quantity: 5,
            unit: 'шт',
            specification: 'M3 Pro, 18GB RAM, 512GB SSD',
          },
          {
            name: 'Монитор Dell UltraSharp 27',
            quantity: 5,
            unit: 'шт',
            specification: '4K, USB-C Hub',
          },
        ],
      };

      await this.prisma.aiSpecJob.update({
        where: { id: jobId },
        data: {
          status: AiSpecJobStatus.COMPLETED,
          completedAt: new Date(),
          resultJson: mockResult as any,
          redactionReport: { redactedItemsCount: 0 } as any,
        },
      });
    } catch (error: any) {
      this.logger.error(`Job ${jobId} failed, processing refund. Reason: ${error.message}`);

      // В случае ошибки возвращаем статус FAILED
      await this.prisma.aiSpecJob.update({
        where: { id: jobId },
        data: {
          status: AiSpecJobStatus.FAILED,
          completedAt: new Date(),
          failureCode: 'AI_PROCESSING_ERROR',
        },
      });

      // Возврат средств
      try {
        await this.walletsService.charge(
          userId,
          AI_SPEC_PRICE_MINOR,
          WalletTransactionType.REFUND,
          `refund-ai-${jobId}`, // idempotency key for refund
          jobId,
        );
      } catch (refundError: any) {
        this.logger.error(`Failed to process refund for job ${jobId}: ${refundError.message}`);
        // В реальном приложении здесь нужен механизм retry или alert для администратора
      }
    }
  }
}
