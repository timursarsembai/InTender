import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAiJobDto {
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
