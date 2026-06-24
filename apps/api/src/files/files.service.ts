import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AntivirusStatus, FileVisibility, OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(FilesService.name);

  constructor(private readonly prisma: PrismaService) {
    this.bucket = process.env.S3_BUCKET || 'intender-files';
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'eu-central-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async createUploadIntent(
    userId: string,
    originalName: string,
    mimeType: string,
    sizeBytes: number,
  ) {
    const ext = path.extname(originalName);
    const storageKey = `${randomUUID()}${ext}`;

    const file = await this.prisma.fileObject.create({
      data: {
        ownerUserId: userId,
        originalName,
        mimeType,
        sizeBytes,
        storageKey,
        antivirusStatus: AntivirusStatus.PENDING,
      },
    });

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
    });

    // URL is valid for 15 minutes
    const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      fileId: file.id,
      uploadUrl: presignedUrl,
    };
  }

  async completeUpload(userId: string, fileId: string) {
    const file = await this.prisma.fileObject.findUnique({ where: { id: fileId } });

    if (!file) throw new NotFoundException('Файл не найден');
    if (file.ownerUserId !== userId) throw new ForbiddenException('Нет прав');

    // Поскольку у нас нет реального антивируса, переводим статус в CLEAN
    return this.prisma.fileObject.update({
      where: { id: fileId },
      data: { antivirusStatus: AntivirusStatus.CLEAN },
    });
  }

  async getDownloadUrl(userId: string, fileId: string) {
    const file = await this.prisma.fileObject.findUnique({
      where: { id: fileId },
      include: {
        attachments: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!file) throw new NotFoundException('Файл не найден');

    const hasAccess = await this.checkFileAccess(userId, file);
    if (!hasAccess) {
      throw new ForbiddenException('Нет прав для скачивания файла');
    }

    if (file.antivirusStatus === AntivirusStatus.INFECTED) {
      throw new ForbiddenException('Файл заражен вирусом и заблокирован');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.storageKey,
    });

    // URL is valid for 15 minutes
    const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      downloadUrl: presignedUrl,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  }

  private async checkFileAccess(userId: string, file: any): Promise<boolean> {
    // Владелец всегда имеет доступ
    if (file.ownerUserId === userId) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    const isSupplier = !!user?.organization;

    // Если файл привязан к заказам, проверяем публичность
    for (const attachment of file.attachments) {
      const order = attachment.order;

      // Если заказ опубликован или закрыт
      if (
        [
          OrderStatus.PUBLISHED,
          OrderStatus.CLOSED_ACCEPTED,
          OrderStatus.CLOSED_WITHOUT_SELECTION,
        ].includes(order.status)
      ) {
        // Если видимость для поставщиков и текущий пользователь - поставщик
        if (attachment.visibility === FileVisibility.SUPPLIERS_VISIBLE && isSupplier) {
          return true;
        }
      }
    }

    return false;
  }
}
