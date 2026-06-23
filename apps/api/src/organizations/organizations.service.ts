import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicOrganizationDto } from './dto/public-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findByOwnerId(ownerUserId: string) {
    return this.prisma.organization.findUnique({
      where: { ownerUserId },
    });
  }

  async getPublicProfile(id: string): Promise<PublicOrganizationDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }

    return new PublicOrganizationDto(org);
  }

  async createOrUpdate(ownerUserId: string, data: any) {
    // Upsert organization for user
    const contacts = data.email ? { email: data.email } : {};
    
    return this.prisma.organization.upsert({
      where: { ownerUserId },
      update: {
        legalType: data.legalType,
        legalName: data.legalName,
        bin: data.bin,
        cityId: data.cityId,
        contacts,
      },
      create: {
        ownerUserId,
        legalType: data.legalType,
        legalName: data.legalName,
        bin: data.bin,
        cityId: data.cityId,
        contacts,
      },
    });
  }
}
