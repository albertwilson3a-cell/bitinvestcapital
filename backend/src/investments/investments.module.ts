import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { InvestmentsController } from './investments.controller.js';
import { InvestmentsService } from './investments.service.js';

@Module({
  imports: [PaymentsModule, SettingsModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
