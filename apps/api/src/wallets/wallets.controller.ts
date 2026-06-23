import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MockTopUpDto } from './dto/top-up.dto';
import { WalletDto, WalletTransactionDto } from './dto/wallet.dto';

@Controller('v1')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/wallet')
  async getWallet(@CurrentUser() user: any): Promise<WalletDto> {
    const wallet = await this.walletsService.getWallet(user.id);
    return {
      id: wallet.id,
      availableBalanceMinor: wallet.availableBalanceMinor,
      version: wallet.version,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/wallet/transactions')
  async getTransactions(@CurrentUser() user: any): Promise<WalletTransactionDto[]> {
    const txs = await this.walletsService.getTransactions(user.id);
    return txs.map((tx) => ({
      id: tx.id,
      type: tx.type,
      direction: tx.direction,
      amountMinor: tx.amountMinor,
      balanceAfterMinor: tx.balanceAfterMinor,
      referenceId: tx.referenceId || undefined,
      createdAt: tx.createdAt,
    }));
  }

  // Заглушка для пополнения (в реальности это был бы webhook от эквайринга)
  @UseGuards(JwtAuthGuard)
  @Post('payments/webhooks/mock')
  async mockTopUp(@CurrentUser() user: any, @Body() dto: MockTopUpDto) {
    const tx = await this.walletsService.topUp(user.id, dto.amountMinor, dto.idempotencyKey);
    return { success: true, transactionId: tx.id };
  }
}
