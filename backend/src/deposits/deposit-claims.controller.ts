import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { UserRole } from '../generated/prisma/client.js';
import {
  AdminDepositClaimQueryDto,
  ApproveDepositClaimDto,
  CreateDepositClaimDto,
  DepositClaimIdDto,
  RejectDepositClaimDto,
} from './deposit-claims.dto.js';
import { DepositClaimsService } from './deposit-claims.service.js';

/** Client reports of deposits sent to a shared platform address. */
@Controller('deposits/claims')
export class DepositClaimsController {
  constructor(private readonly claims: DepositClaimsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.claims.list(user.id);
  }

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: CreateDepositClaimDto) {
    return this.claims.submit(user.id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: AuthUser, @Param() p: DepositClaimIdDto) {
    return this.claims.cancel(user.id, p.id);
  }
}

/** Staff review of reported deposits. */
@Roles(UserRole.ADMIN)
@Controller('admin/deposits')
export class AdminDepositClaimsController {
  constructor(private readonly claims: DepositClaimsService) {}

  @Get()
  list(@Query() q: AdminDepositClaimQueryDto) {
    return this.claims.adminList(q.status ?? 'PENDING_REVIEW');
  }

  @Get('counts')
  counts() {
    return this.claims.adminCounts();
  }

  @Get('addresses')
  addresses() {
    return this.claims.sharedAddresses();
  }

  @Get(':id')
  detail(@Param() p: DepositClaimIdDto) {
    return this.claims.adminDetail(p.id);
  }

  @Get(':id/chain')
  chain(@Param() p: DepositClaimIdDto) {
    return this.claims.adminChainCheck(p.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param() p: DepositClaimIdDto, @Body() dto: ApproveDepositClaimDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.claims.approve(p.id, admin.id, dto.amount, dto.note, ip);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param() p: DepositClaimIdDto, @Body() dto: RejectDepositClaimDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.claims.reject(p.id, admin.id, dto.reason, ip);
  }
}
