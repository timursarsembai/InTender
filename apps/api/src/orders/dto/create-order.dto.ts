import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { LogisticsOption, VatOption, FileVisibility } from '@prisma/client';
import { Type } from 'class-transformer';

export class OrderAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsEnum(FileVisibility)
  visibility!: FileVisibility;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsString()
  @IsOptional()
  specification?: string;

  @IsString()
  @IsOptional()
  brandModel?: string;

  @IsString()
  @IsNotEmpty({ message: 'Поле Адрес доставки не должно быть пустым' })
  deliveryAddress!: string;

  @IsString()
  @IsOptional()
  deliveryRegion?: string;

  @IsString()
  @IsOptional()
  deliveryDistrict?: string;

  @IsString()
  @IsOptional()
  deliveryCity?: string;

  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @IsString()
  @IsOptional()
  supplierGeography?: string;

  @IsEnum(LogisticsOption)
  @IsOptional()
  logistics?: LogisticsOption;

  @IsNumber()
  @Min(0)
  @IsOptional()
  desiredPriceMinor?: number;

  @IsEnum(VatOption)
  @IsOptional()
  vatOption?: VatOption;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsDateString()
  @IsNotEmpty()
  deadline!: string;

  @IsDateString()
  @IsOptional()
  offerDeadline?: string;

  @IsBoolean()
  @IsOptional()
  certificateRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  warrantyRequired?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAttachmentDto)
  @IsOptional()
  attachments?: OrderAttachmentDto[];
}
