import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { ChainLookupService } from './chain-lookup.service.js';
import { AdminDepositClaimsController, DepositClaimsController } from './deposit-claims.controller.js';
import { DepositClaimsService } from './deposit-claims.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [DepositClaimsController, AdminDepositClaimsController],
  providers: [DepositClaimsService, ChainLookupService],
  exports: [DepositClaimsService, ChainLookupService],
})
export class DepositsModule {}
