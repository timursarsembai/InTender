import { IsString, IsNotEmpty } from 'class-validator';

export class PublishOrderDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
