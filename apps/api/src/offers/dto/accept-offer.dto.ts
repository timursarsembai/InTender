import { IsString, IsNotEmpty } from 'class-validator';

export class AcceptOfferDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
