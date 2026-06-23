import { IsString, IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';

export class CreateRatingDto {
  @IsUUID()
  targetUserId!: string;

  @IsUUID()
  targetOrderId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
