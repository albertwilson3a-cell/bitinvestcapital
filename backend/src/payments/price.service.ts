import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetType, Prisma } from '../generated/prisma/client.js';
import { MarketDataService } from '../market/market-data.service.js';
import { COIN_BY_SYMBOL } from '../market/coins.js';
import { simulatedPrice } from '../market/simulated-market.js';

export class PriceUnavailableError extends Error {}

export type PriceSource = 'coingecko' | 'simulated';

export interface PriceQuote {
  asset: AssetType;
  usd: string;
  change24hPercent: number | null;
}

export interface PriceSnapshot {
  source: PriceSource;
  updatedAt: string;
  quotes: PriceQuote[];
}

/**
 * USD prices for BTC and ETH (USDT is valued at exactly 1).
 *  - coingecko (default): live prices from the shared market feed.
 *  - simulated: deterministic model for automated tests; refused in production.
 * Used by the ledger (referral rewards) and GET /api/market/prices.
 */
@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly source: PriceSource;

  constructor(
    private readonly market: MarketDataService,
    config: ConfigService,
  ) {
    this.source = config.get<PriceSource>('PRICE_PROVIDER') ?? 'coingecko';
    if (this.source === 'simulated') {
      this.logger.warn('PRICE_PROVIDER=simulated: prices are simulated for development only.');
    }
  }

  async getUsdPrice(asset: AssetType): Promise<Prisma.Decimal> {
    if (asset === AssetType.USDT) return new Prisma.Decimal(1);
    const quote = (await this.getSnapshot()).quotes.find((q) => q.asset === asset);
    if (!quote) throw new PriceUnavailableError(`USD price for ${asset} is unavailable`);
    return new Prisma.Decimal(quote.usd);
  }

  async getSnapshot(): Promise<PriceSnapshot> {
    return this.source === 'simulated' ? this.simulated() : this.coingecko();
  }

  /** Spot prices come from the shared market feed (one CoinGecko request serves the whole site). */
  private async coingecko(): Promise<PriceSnapshot> {
    let overview;
    try {
      overview = await this.market.overview();
    } catch (err) {
      this.logger.error(`Price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new PriceUnavailableError('USD prices are unavailable');
    }
    const quotes: PriceQuote[] = [{ asset: AssetType.USDT, usd: '1', change24hPercent: 0 }];
    for (const k of ['BTC', 'ETH'] as const) {
      const c = overview.coins.find((x) => x.symbol === k);
      if (!c || !Number.isFinite(c.priceUsd) || c.priceUsd <= 0) throw new PriceUnavailableError(`USD price for ${k} is unavailable`);
      quotes.push({ asset: AssetType[k], usd: c.priceUsd.toString(), change24hPercent: c.change24hPercent === null ? null : Number(c.change24hPercent.toFixed(4)) });
    }
    return { source: 'coingecko', updatedAt: overview.updatedAt, quotes };
  }

  private simulated(): PriceSnapshot {
    const now = Date.now();
    const quote = (k: 'BTC' | 'ETH'): PriceQuote => {
      const coin = COIN_BY_SYMBOL.get(k)!;
      const price = simulatedPrice(coin, now);
      const dayAgo = simulatedPrice(coin, now - 86_400_000);
      return {
        asset: AssetType[k],
        usd: price.toFixed(2),
        change24hPercent: Number((((price - dayAgo) / dayAgo) * 100).toFixed(4)),
      };
    };
    return {
      source: 'simulated',
      updatedAt: new Date(now).toISOString(),
      quotes: [{ asset: AssetType.USDT, usd: '1', change24hPercent: 0 }, quote('BTC'), quote('ETH')],
    };
  }
}
