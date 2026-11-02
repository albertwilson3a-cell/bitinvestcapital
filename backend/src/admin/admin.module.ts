import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { AdjustmentsService } from './adjustments.service.js';
import { AdminController } from './admin.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { MetricsService } from './metrics.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [AdminController],
  providers: [MetricsService, AdminUsersService, AdjustmentsService],
})
export class AdminModule {}
