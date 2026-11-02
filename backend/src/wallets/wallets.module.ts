import { Module } from '@nestjs/common';
import { DepositAddressService } from './deposit-address.service.js';
import { HdDerivationService } from './hd-derivation.service.js';
import { WalletsController } from './wallets.controller.js';
import { WalletsService } from './wallets.service.js';

@Module({
  controllers: [WalletsController],
  providers: [HdDerivationService, DepositAddressService, WalletsService],
  exports: [HdDerivationService, DepositAddressService],
})
export class WalletsModule {}
