import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { YieldInterval } from '../generated/prisma/client.js';
import { YieldEngineService, type RunTrigger } from './yield-engine.service.js';

/**
 * Cron entry points. Each asset's rate says whether it pays HOURLY or DAILY;
 * both crons run, and each pays only the assets configured for its interval.
 * Safe with multiple app instances: runs are claimed by unique period key.
 */
@Injectable()
export class YieldScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(YieldScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly engine: YieldEngineService,
    config: ConfigService,
  ) {
    this.enabled = String(config.get('YIELD_SCHEDULER_ENABLED') ?? 'true') === 'true';
  }

  /** Daily at 00:00 UTC: pays the day that just ended. */
  @Cron('0 0 * * *', { name: 'yield-daily', timeZone: 'UTC' })
  daily() {
    return this.run(YieldInterval.DAILY, 'scheduler');
  }

  /** Top of every hour: pays the hour that just ended. */
  @Cron('0 * * * *', { name: 'yield-hourly', timeZone: 'UTC' })
  hourly() {
    return this.run(YieldInterval.HOURLY, 'scheduler');
  }

  /** Catch up the latest period if the app was down when the cron should have fired. */
  onApplicationBootstrap() {
    if (!this.enabled) {
      this.logger.log('Yield scheduler disabled (YIELD_SCHEDULER_ENABLED=false)');
      return;
    }
    setTimeout(() => {
      void this.run(YieldInterval.DAILY, 'startup').then(() => this.run(YieldInterval.HOURLY, 'startup'));
    }, 5_000).unref();
  }

  private async run(interval: YieldInterval, trigger: RunTrigger): Promise<void> {
    if (!this.enabled) return;
    try {
      const result = await this.engine.runLatest(interval, trigger);
      if (result.status !== 'already_completed' && result.status !== 'skipped') {
        this.logger.log(`${interval} yield run (${trigger}): ${result.status}`);
      }
    } catch (err) {
      this.logger.error(`${interval} yield run crashed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
