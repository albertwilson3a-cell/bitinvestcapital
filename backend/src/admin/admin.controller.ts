import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Post, Put, Query } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { UserRole } from '../generated/prisma/client.js';
import { SettingsService } from '../settings/settings.service.js';
import { AdjustmentsService } from './adjustments.service.js';
import { AdminUsersService } from './admin-users.service.js';
import {
  CreateAdjustmentDto,
  DecideAdjustmentDto,
  ListAdjustmentsQueryDto,
  ListUsersQueryDto,
  SuspendUserDto,
  PageQueryDto,
  UpdateSettingsDto,
  UserIdParamDto,
} from './dto/admin.dto.js';
import { MetricsService } from './metrics.service.js';

/**
 * Admin console API. Every route requires a valid JWT (global guard) AND the
 * ADMIN role, re-read from the database on each request (RolesGuard).
 */
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly users: AdminUsersService,
    private readonly adjustments: AdjustmentsService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get('metrics')
  overview() {
    return this.metrics.overview();
  }

  // ── Users ─────────────────────────────────────────────────────────
  @Get('users')
  listUsers(@Query() q: ListUsersQueryDto) {
    return this.users.list(q);
  }

  @Get('users/:id')
  async user(@Param() p: UserIdParamDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    const detail = await this.users.detail(p.id);
    // Viewing a customer's full record is itself an audited action.
    await this.audit.record({ actorId: admin.id, action: 'user.view', targetType: 'user', targetId: p.id, ip });
    return detail;
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param() p: UserIdParamDto, @Body() dto: SuspendUserDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    const res = await this.users.setSuspended(p.id, admin.id, true, dto.reason);
    await this.audit.record({ actorId: admin.id, action: 'user.suspend', targetType: 'user', targetId: p.id, details: { reason: dto.reason }, ip });
    return res;
  }

  @Post('users/:id/unsuspend')
  @HttpCode(HttpStatus.OK)
  async unsuspend(@Param() p: UserIdParamDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    const res = await this.users.setSuspended(p.id, admin.id, false);
    await this.audit.record({ actorId: admin.id, action: 'user.unsuspend', targetType: 'user', targetId: p.id, ip });
    return res;
  }

  @Post('users/:id/adjustments')
  requestAdjustment(@Param() p: UserIdParamDto, @Body() dto: CreateAdjustmentDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.adjustments.request(p.id, dto, admin.id, ip);
  }

  // ── Adjustments (maker–checker) ───────────────────────────────────
  @Get('adjustments')
  listAdjustments(@Query() q: ListAdjustmentsQueryDto) {
    return this.adjustments.list(q.status, q.limit);
  }

  @Post('adjustments/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param() p: UserIdParamDto, @Body() dto: DecideAdjustmentDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.adjustments.approve(p.id, admin.id, dto.note, ip);
  }

  @Post('adjustments/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param() p: UserIdParamDto, @Body() dto: DecideAdjustmentDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    return this.adjustments.reject(p.id, admin.id, dto.note, ip);
  }

  // ── Platform parameters ───────────────────────────────────────────
  @Get('settings')
  async getSettings() {
    const [settings, history] = await Promise.all([this.settings.list(), this.settings.history(25)]);
    return { settings, history };
  }

  @Put('settings')
  async putSettings(@Body() dto: UpdateSettingsDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    const { note, ...changes } = dto;
    const applied = await this.settings.update(changes, admin.id, note);
    if (applied.length) {
      await this.audit.record({ actorId: admin.id, action: 'settings.update', targetType: 'settings', details: { applied, note }, ip });
    }
    return { applied, ...(await this.getSettings()) };
  }

  // ── Audit ─────────────────────────────────────────────────────────
  @Get('audit')
  async auditLog(@Query() q: PageQueryDto) {
    const rows = await this.audit.list(q.limit + 1, q.cursor);
    const hasMore = rows.length > q.limit;
    const items = hasMore ? rows.slice(0, q.limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }
}
