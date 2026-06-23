import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class MockTopUpDto {
  @IsInt()
  @Min(100000) // Minimum 1000 KZT (100,000 tiyns)
  amountMinor!: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
