import { Organization, OrganizationLegalType, VerificationStatus } from '@prisma/client';

export class PublicOrganizationDto {
  id: string;
  legalType: OrganizationLegalType;
  cityId: string | null;
  businessStartedAt: Date | null;
  verificationStatus: VerificationStatus;
  publicAlias: string | null;

  constructor(org: Organization) {
    this.id = org.id;
    this.legalType = org.legalType;
    this.cityId = org.cityId;
    this.businessStartedAt = org.businessStartedAt;
    this.verificationStatus = org.verificationStatus;
    this.publicAlias = org.publicAlias;
  }
}
