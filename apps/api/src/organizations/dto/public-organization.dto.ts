import { Organization, OrganizationLegalType, VerificationStatus } from '@prisma/client';

export class PublicOrganizationDto {
  id: string;
  legalType: OrganizationLegalType;
  cityId: string | null;
  region: string | null;
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  businessStartedAt: Date | null;
  verificationStatus: VerificationStatus;
  publicAlias: string | null;

  constructor(org: Organization) {
    this.id = org.id;
    this.legalType = org.legalType;
    this.cityId = org.cityId;
    this.region = org.region;
    this.district = org.district;
    this.city = org.city;
    this.latitude = org.latitude;
    this.longitude = org.longitude;
    this.businessStartedAt = org.businessStartedAt;
    this.verificationStatus = org.verificationStatus;
    this.publicAlias = org.publicAlias;
  }
}
