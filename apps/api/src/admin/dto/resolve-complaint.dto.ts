import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ComplaintStatus, UserStatus } from '@prisma/client';

export class ResolveComplaintDto {
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;

  @IsString()
  @IsNotEmpty()
  resolution!: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  refundAmountMinor?: number;

  @IsEnum(UserStatus)
  @IsOptional()
  blockTargetUserStatus?: UserStatus;
}
