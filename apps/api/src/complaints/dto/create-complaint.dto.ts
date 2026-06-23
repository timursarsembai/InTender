import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  targetUserId?: string;

  @IsUUID()
  @IsOptional()
  targetOrderId?: string;

  @IsUUID()
  @IsOptional()
  targetOfferId?: string;
}
