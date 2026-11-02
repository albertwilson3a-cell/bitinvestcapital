import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { PriceService, PriceUnavailableError } from './price.service.js';

/** Public USD quotes for the supported assets (used by the dashboard's price ticks). */
@Public()
@Controller('market')
export class MarketController {
  constructor(private readonly prices: PriceService) {}

  @Get('prices')
  async prices_() {
    try {
      return await this.prices.getSnapshot();
    } catch (err) {
      if (err instanceof PriceUnavailableError) throw new ServiceUnavailableException(err.message);
      throw err;
    }
  }
}
