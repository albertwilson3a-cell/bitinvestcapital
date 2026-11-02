import { Controller, Get, Param, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { AssetParamDto, ListTransactionsQueryDto } from './dto/wallets.dto.js';
import { WalletsService } from './wallets.service.js';

/** All routes require a verified user's JWT (global guard). */
@Controller('wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.wallets.getWallets(user.id);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: AuthUser, @Query() query: ListTransactionsQueryDto) {
    return this.wallets.listTransactions(user.id, query);
  }

  @Get(':asset/deposit-address')
  depositAddress(@CurrentUser() user: AuthUser, @Param() params: AssetParamDto) {
    return this.wallets.getDepositAddress(user.id, params.asset);
  }
}
