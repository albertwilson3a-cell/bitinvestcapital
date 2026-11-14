import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { AssetParamDto, InvestDto, RedeemDto } from './investments.dto.js';
import { InvestmentsService } from './investments.service.js';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investments: InvestmentsService) {}

  /** Wallet and investment per coin, with the current rate and next payout. */
  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.investments.summary(user.id);
  }

  @Get(':asset/history')
  history(@CurrentUser() user: AuthUser, @Param() p: AssetParamDto) {
    return this.investments.history(user.id, p.asset);
  }

  @Post('invest')
  @HttpCode(HttpStatus.OK)
  invest(@CurrentUser() user: AuthUser, @Body() dto: InvestDto) {
    return this.investments.invest(user.id, dto.asset, dto.amount);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemDto) {
    if (!dto.all && !dto.amount) throw new BadRequestException('Give an amount, or all: true');
    return this.investments.redeem(user.id, dto.asset, dto.amount, !!dto.all);
  }
}
