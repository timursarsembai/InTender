import { WalletTransactionType, TransactionDirection } from '@prisma/client';

export class WalletDto {
  id!: string;
  availableBalanceMinor!: number;
  version!: number;
}

export class WalletTransactionDto {
  id!: string;
  type!: WalletTransactionType;
  direction!: TransactionDirection;
  amountMinor!: number;
  balanceAfterMinor!: number;
  referenceId?: string;
  createdAt!: Date;
}
