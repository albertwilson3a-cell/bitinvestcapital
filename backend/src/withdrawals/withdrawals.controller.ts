import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Post, Put, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { UserRole } from '../generated/prisma/client.js';
import {
  AdminWithdrawalQueryDto,
  ApproveWithdrawalDto,
  AssetParamDto,
  CompleteWithdrawalDto,
  ConfirmWithdrawalDto,
  CreateWithdrawalDto,
  RejectWithdrawalDto,
  ResendWithdrawalCodeDto,
  UpdateWithdrawalSettingDto,
  WithdrawalIdDto,
} from './withdrawals.dto.js';
import { WithdrawalsService } from './withdrawals.service.js';

/** Client withdrawals (signed-in users). */
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Get('options')
  options(@CurrentUser() user: AuthUser) {
    return this.withdrawals.options(user.id);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.withdrawals.list(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  request(@CurrentUser() user: AuthUser, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawals.request(user.id, dto.asset, dto.amount, dto.address);
  }

  @Post('confirm')
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmWithdrawalDto) {
    return this.withdrawals.confirm(user.id, dto.challengeId, dto.code);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  resend(@CurrentUser() user: AuthUser, @Body() dto: ResendWithdrawalCodeDto) {
    return this.withdrawals.resendCode(user.id, dto.challengeId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: AuthUser, @Param() p: WithdrawalIdDto) {
    return this.withdrawals.cancel(user.id, p.id);
  }
}

/** Manual review and release of withdrawals by administrators. */
@Roles(UserRole.ADMIN)
@Controller('admin/withdrawals')
export class AdminWithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Get()
  list(@Query() q: AdminWithdrawalQueryDto) {
    return this.withdrawals.adminList(q.status ?? 'PENDING_REVIEW');
  }

  @Get('counts')
  counts() {
    return this.withdrawals.adminCounts();
  }

  @Get('settings')
  settings() {
    return this.withdrawals.settings();
  }

  @Put('settings/:asset')
  updateSetting(@Param() p: AssetParamDto, @Body() dto: UpdateWithdrawalSettingDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.withdrawals.updateSetting(p.asset, dto, admin.id, ip);
  }

  @Get(':id')
  detail(@Param() p: WithdrawalIdDto) {
    return this.withdrawals.adminDetail(p.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param() p: WithdrawalIdDto, @Body() dto: ApproveWithdrawalDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.withdrawals.approve(p.id, admin.id, dto.note, ip);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Param() p: WithdrawalIdDto, @Body() dto: CompleteWithdrawalDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.withdrawals.complete(p.id, admin.id, dto.txHash, ip);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param() p: WithdrawalIdDto, @Body() dto: RejectWithdrawalDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.withdrawals.reject(p.id, admin.id, dto.reason, ip);
  }
}
