import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletTransactionType, TransactionDirection, Prisma } from '@prisma/client';
import { ErrorCode } from '@intender/shared';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          availableBalanceMinor: 0,
        },
      });
    }

    return wallet;
  }

  async getTransactions(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async topUp(userId: string, amountMinor: number, idempotencyKey: string) {
    return this.executeWalletMutation(
      userId,
      amountMinor,
      TransactionDirection.CREDIT,
      WalletTransactionType.TOP_UP,
      idempotencyKey,
    );
  }

  async charge(
    userId: string,
    amountMinor: number,
    type: WalletTransactionType,
    idempotencyKey: string,
    referenceId?: string,
    action?: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    return this.executeWalletMutation(
      userId,
      amountMinor,
      TransactionDirection.DEBIT,
      type,
      idempotencyKey,
      referenceId,
      3,
      action,
    );
  }

  /**
   * Executes a wallet mutation with Optimistic Concurrency Control and retries.
   */
  private async executeWalletMutation(
    userId: string,
    amountMinor: number,
    direction: TransactionDirection,
    type: WalletTransactionType,
    idempotencyKey: string,
    referenceId?: string,
    retries = 3,
    action?: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const wallet = await this.getWallet(userId);

        if (
          direction === TransactionDirection.DEBIT &&
          wallet.availableBalanceMinor < amountMinor
        ) {
          throw new BadRequestException({
            message: 'Недостаточно средств',
            code: ErrorCode.INSUFFICIENT_BALANCE,
          });
        }

        const newBalance =
          direction === TransactionDirection.CREDIT
            ? wallet.availableBalanceMinor + amountMinor
            : wallet.availableBalanceMinor - amountMinor;

        const result = await this.prisma.$transaction(async (tx) => {
          // Optimistic locking update
          const updateResult = await tx.wallet.updateMany({
            where: {
              id: wallet.id,
              version: wallet.version, // Ensure version hasn't changed
            },
            data: {
              availableBalanceMinor: newBalance,
              version: { increment: 1 },
            },
          });

          if (updateResult.count === 0) {
            throw new Error('OCC_CONFLICT');
          }

          if (action) {
            await action(tx as Prisma.TransactionClient);
          }

          // Create ledger record
          const transaction = await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amountMinor,
              direction,
              type,
              balanceAfterMinor: newBalance,
              idempotencyKey,
              referenceId,
            },
          });

          return transaction;
        });

        return result;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            // Unique constraint failed on idempotencyKey
            throw new ConflictException({
              message: 'Операция с таким ключом уже была выполнена',
              code: ErrorCode.IDEMPOTENCY_CONFLICT,
            });
          }
        }

        if ((error as any).message === 'OCC_CONFLICT') {
          this.logger.warn(
            `OCC Conflict on wallet mutation for user ${userId}, attempt ${attempt}`,
          );
          if (attempt === retries) {
            throw new ConflictException({
              message: 'Сервис перегружен, попробуйте еще раз',
              code: 'CONCURRENCY_CONFLICT',
            });
          }
          // Retry automatically
          continue;
        }

        // Re-throw other errors (like InsufficientBalance)
        throw error;
      }
    }
  }
}
