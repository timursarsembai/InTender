import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OfferVatStatus } from '@prisma/client';

export class OfferConfirmationsDto {
  @IsBoolean()
  isNew!: boolean;

  @IsBoolean()
  conforms!: boolean;

  @IsBoolean()
  hasCertificates!: boolean;
}

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsNumber()
  @Min(0)
  pricePerUnitMinor!: number;

  @IsNumber()
  @Min(0)
  goodsTotalMinor!: number;

  @IsNumber()
  @Min(0)
  deliveryCostMinor!: number;

  @IsNumber()
  @Min(0)
  grandTotalMinor!: number;

  @IsNumber()
  @Min(0)
  deliveryDays!: number;

  @IsString()
  @IsOptional()
  departureRegion?: string;

  @IsString()
  @IsOptional()
  departureDistrict?: string;

  @IsString()
  @IsOptional()
  departureCity?: string;

  @IsNumber()
  @IsOptional()
  departureLat?: number;

  @IsNumber()
  @IsOptional()
  departureLng?: number;

  @IsString()
  @IsOptional()
  brandModel?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsEnum(OfferVatStatus)
  vatStatus!: OfferVatStatus;

  @IsString()
  @IsNotEmpty()
  paymentTerms!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => OfferConfirmationsDto)
  confirmations!: OfferConfirmationsDto;
}
