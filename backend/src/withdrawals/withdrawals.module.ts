import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminWithdrawalsController, WithdrawalsController } from './withdrawals.controller.js';
import { WithdrawalsService } from './withdrawals.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WithdrawalsController, AdminWithdrawalsController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}
