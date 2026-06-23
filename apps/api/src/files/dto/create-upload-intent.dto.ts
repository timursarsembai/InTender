import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateUploadIntentDto {
  @IsString()
  @IsNotEmpty()
  originalName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsNumber()
  @Min(1)
  sizeBytes!: number;
}
