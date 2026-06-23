import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComplaint(userId: string, dto: CreateComplaintDto) {
    return this.prisma.complaint.create({
      data: {
        reporterUserId: userId,
        reason: dto.reason,
        description: dto.description,
        targetUserId: dto.targetUserId,
        targetOrderId: dto.targetOrderId,
        targetOfferId: dto.targetOfferId,
      },
    });
  }

  async getMyComplaints(userId: string) {
    return this.prisma.complaint.findMany({
      where: { reporterUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
