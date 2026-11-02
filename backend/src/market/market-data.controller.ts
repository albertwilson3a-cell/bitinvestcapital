import { BadRequestException, Controller, Get, Header, Param, Query, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { CHART_RANGES, COINS, type ChartRange } from './coins.js';
import { MarketDataService, MarketDataUnavailableError } from './market-data.service.js';

const unavailable = (err: unknown) => {
  if (err instanceof MarketDataUnavailableError) return new ServiceUnavailableException(err.message);
  return err;
};

/** Public market data for the website and the client dashboard charts. */
@Public()
@Controller('market')
export class MarketDataController {
  constructor(private readonly market: MarketDataService) {}

  /** Supported coins, in display order. */
  @Get('catalog')
  @Header('cache-control', 'public, max-age=3600')
  catalog() {
    return COINS.map((c) => ({ symbol: c.symbol, name: c.name, stable: !!c.stable }));
  }

  @Get('coins')
  @Header('cache-control', 'public, max-age=15')
  async coins() {
    try {
      return await this.market.overview();
    } catch (err) {
      throw unavailable(err);
    }
  }

  @Get('coins/:symbol/chart')
  @Header('cache-control', 'public, max-age=60')
  async chart(@Param('symbol') symbol: string, @Query('range') rangeParam?: string) {
    const range = (rangeParam ?? '7D').toUpperCase() as ChartRange;
    if (!CHART_RANGES.includes(range)) {
      throw new BadRequestException(`range must be one of ${CHART_RANGES.join(', ')}`);
    }
    if (!/^[A-Za-z0-9]{2,10}$/.test(symbol)) throw new BadRequestException('Invalid coin symbol');
    try {
      return await this.market.chart(symbol, range);
    } catch (err) {
      throw unavailable(err);
    }
  }
}
