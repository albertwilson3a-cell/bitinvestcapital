import { Module } from '@nestjs/common';
import { AdminYieldsController } from './admin-yields.controller.js';
import { PublicRatesController } from './public-rates.controller.js';
import { YieldEngineService } from './yield-engine.service.js';
import { YieldRatesService } from './yield-rates.service.js';
import { YieldScheduler } from './yield.scheduler.js';

@Module({
  controllers: [AdminYieldsController, PublicRatesController],
  providers: [YieldRatesService, YieldEngineService, YieldScheduler],
  exports: [YieldEngineService],
})
export class YieldModule {}
