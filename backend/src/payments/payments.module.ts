import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module.js';
import { WalletsModule } from '../wallets/wallets.module.js';
import { LedgerService } from './ledger.service.js';
import { MarketController } from './market.controller.js';
import { PaymentsController } from './payments.controller.js';
import { PriceService } from './price.service.js';
import { WebhookSignatureGuard } from './webhook-signature.guard.js';

@Module({
  imports: [WalletsModule, MarketModule],
  controllers: [PaymentsController, MarketController],
  providers: [LedgerService, PriceService, WebhookSignatureGuard],
  exports: [LedgerService, PriceService],
})
export class PaymentsModule {}
