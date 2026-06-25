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
import { AiSpecJobStatus, WalletTransactionType } from '@prisma/client';
import { ErrorCode } from '@intender/shared';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { AiProvider } from './providers/ai-provider.interface';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';

const AI_SPEC_PRICE_MINOR = 100000; // 1000 KZT

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
  ) {
    this.bucket = process.env.S3_BUCKET || 'intender-files';
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: true,
    });
  }

  private async resolveProvider(): Promise<AiProvider> {
    const rows = await this.prisma.appConfig.findMany({
      where: { key: { in: ['ai.provider', 'ai.deepseek.apiKey', 'ai.anthropic.apiKey', 'ai.gemini.apiKey'] } },
    });
    const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const providerName = cfg['ai.provider'] ?? process.env.AI_PROVIDER ?? 'deepseek';
    this.logger.log(`AI provider: ${providerName}`);

    const makeError = (msg: string): AiProvider => ({
      analyzeSpec: async () => { throw new Error(msg); },
    });

    switch (providerName) {
      case 'deepseek': {
        const key = cfg['ai.deepseek.apiKey'] ?? process.env.DEEPSEEK_API_KEY;
        return key ? new DeepSeekProvider(key) : makeError('DEEPSEEK_API_KEY не задан');
      }
      case 'claude': {
        const key = cfg['ai.anthropic.apiKey'] ?? process.env.ANTHROPIC_API_KEY;
        return key ? new ClaudeProvider(key) : makeError('ANTHROPIC_API_KEY не задан');
      }
      case 'gemini': {
        const key = cfg['ai.gemini.apiKey'] ?? process.env.GEMINI_API_KEY;
        return key ? new GeminiProvider(key) : makeError('GEMINI_API_KEY не задан');
      }
      default:
        return makeError(`Неизвестный AI_PROVIDER: ${providerName}`);
    }
  }

  async createJob(userId: string, fileId: string, idempotencyKey: string) {
    const file = await this.prisma.fileObject.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException({ message: 'Файл не найден' });
    }
    if (file.ownerUserId !== userId) {
      throw new ForbiddenException({ message: 'Нет прав на этот файл' });
    }

    let job: { id: string; userId: string } | undefined;

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
        (error.getResponse() as { code?: string }).code === ErrorCode.IDEMPOTENCY_CONFLICT
      ) {
        const existingJob = await this.prisma.aiSpecJob.findFirst({
          where: { userId, sourceFileId: fileId },
          orderBy: { createdAt: 'desc' },
        });
        if (existingJob) return existingJob;
      }
      throw error;
    }

    if (!job) throw new BadRequestException('Не удалось создать задачу');

    this.processJobAsync(job.id, userId).catch((err: Error) => {
      this.logger.error(`Error processing job ${job!.id}: ${err.message}`, err.stack);
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
    await this.prisma.aiSpecJob.update({
      where: { id: jobId },
      data: { status: AiSpecJobStatus.PROCESSING },
    });

    try {
      const job = await this.prisma.aiSpecJob.findUnique({
        where: { id: jobId },
        include: { sourceFile: true },
      });
      if (!job) throw new Error('Job не найден');

      const provider = await this.resolveProvider();
      const fileBuffer = await this.downloadFromS3(job.sourceFile.storageKey);
      const result = await provider.analyzeSpec(
        fileBuffer,
        job.sourceFile.mimeType,
        job.sourceFile.originalName,
      );

      await this.prisma.aiSpecJob.update({
        where: { id: jobId },
        data: {
          status: AiSpecJobStatus.COMPLETED,
          completedAt: new Date(),
          resultJson: result as object,
          redactionReport: { redactedItemsCount: 0 } as object,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job ${jobId} failed: ${message}`);

      await this.prisma.aiSpecJob.update({
        where: { id: jobId },
        data: {
          status: AiSpecJobStatus.FAILED,
          completedAt: new Date(),
          failureCode: 'AI_PROCESSING_ERROR',
        },
      });

      try {
        await this.walletsService.refund(
          userId,
          AI_SPEC_PRICE_MINOR,
          `refund-ai-${jobId}`,
          jobId,
        );
      } catch (refundError: unknown) {
        const refundMessage = refundError instanceof Error ? refundError.message : String(refundError);
        this.logger.error(`Refund failed for job ${jobId}: ${refundMessage}`);
      }
    }
  }

  private async downloadFromS3(storageKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    const response = await this.s3Client.send(command);

    if (!response.Body) throw new Error('Пустой ответ от S3');

    const stream = response.Body as Readable;
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
