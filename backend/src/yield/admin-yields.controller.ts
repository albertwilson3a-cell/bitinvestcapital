import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Post, Put, Query } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { UserRole } from '../generated/prisma/client.js';
import { ListQueryDto, TriggerRunDto, UpdateYieldRateDto, YieldAssetParamDto } from './dto/yield.dto.js';
import { YieldEngineService } from './yield-engine.service.js';
import { YieldRatesService } from './yield-rates.service.js';

/** Operator panel for the rate matrix and payout runs. ADMIN role only. */
@Roles(UserRole.ADMIN)
@Controller('admin/yields')
export class AdminYieldsController {
  constructor(
    private readonly rates: YieldRatesService,
    private readonly engine: YieldEngineService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async overview() {
    return {
      rates: await this.rates.matrix(),
      affiliateYieldRewardRate: (await this.settings.getDecimal('affiliateYieldRewardRate')).toFixed(),
      maxApyPercent: this.rates.maxApyPercent,
      maxWeeklyPercent: this.rates.maxWeeklyPercent,
      schedule: { daily: '0 0 * * * (UTC)', hourly: '0 * * * * (UTC)' },
    };
  }

  /** Body: { "apyPercent": "6.5", "interval": "DAILY", "isActive": true, "note": "Q4 lending desk rates" } */
  @Put(':asset')
  async setRate(@Param() p: YieldAssetParamDto, @Body() dto: UpdateYieldRateDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    const matrix = await this.rates.set(p.asset, dto, admin.id);
    await this.audit.record({ actorId: admin.id, action: 'yield_rate.update', targetType: 'asset', targetId: p.asset, details: { weeklyPercent: dto.weeklyPercent, apyPercent: dto.apyPercent, interval: dto.interval, isActive: dto.isActive, note: dto.note }, ip });
    return matrix;
  }

  @Get('history')
  history(@Query() q: ListQueryDto) {
    return this.rates.history(q.limit, q.asset);
  }

  @Get('runs')
  runs(@Query() q: ListQueryDto) {
    return this.engine.listRuns(q.limit);
  }

  /** Runs (or resumes) the latest completed period now. Idempotent. */
  @Post('runs')
  @HttpCode(HttpStatus.OK)
  async trigger(@Body() dto: TriggerRunDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    const result = await this.engine.runLatest(dto.interval, 'manual');
    await this.audit.record({
      actorId: admin.id,
      action: 'yield_run.trigger',
      targetType: 'yield_run',
      targetId: 'run' in result ? result.run.periodKey : result.periodKey,
      details: { interval: dto.interval, status: result.status },
      ip,
    });
    return result;
  }
}
