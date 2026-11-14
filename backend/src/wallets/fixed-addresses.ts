import type { ConfigService } from '@nestjs/config';
import { AssetType, BlockchainNetwork } from '../generated/prisma/client.js';
import { ASSET_NETWORK, btcNetworkFor, normalizeAddress } from './chains.js';

/** Environment variable that holds the shared deposit address for each asset. */
export const FIXED_ADDRESS_ENV: Record<AssetType, string> = {
  [AssetType.BTC]: 'DEPOSIT_ADDRESS_BTC',
  [AssetType.ETH]: 'DEPOSIT_ADDRESS_ETH',
  [AssetType.USDT]: 'DEPOSIT_ADDRESS_USDT',
};

export type FixedAddresses = Partial<Record<AssetType, string>>;

/**
 * Reads the shared ("fixed") deposit addresses from the environment.
 *
 * An asset with a fixed address does not get a per-client HD address: every
 * client is shown the same address, so a deposit cannot be matched to its
 * sender automatically. Clients report the transaction hash instead and staff
 * confirm it before anything is credited (see DepositClaimsService).
 *
 * Throws at startup on a malformed address, so a typo can never reach clients.
 */
export function readFixedAddresses(config: Pick<ConfigService, 'get'>): FixedAddresses {
  const btcNetwork = btcNetworkFor(config.get<string>('BTC_NETWORK') ?? 'mainnet');
  const out: FixedAddresses = {};
  for (const asset of Object.values(AssetType)) {
    const key = FIXED_ADDRESS_ENV[asset];
    const raw = (config.get<string>(key) ?? '').trim();
    if (!raw) continue;
    try {
      out[asset] = normalizeAddress(ASSET_NETWORK[asset], raw, btcNetwork);
    } catch {
      const kind = ASSET_NETWORK[asset] === BlockchainNetwork.ETHEREUM ? 'an Ethereum (0x…) address' : 'a Bitcoin address';
      throw new Error(`${key} must be ${kind}; got "${raw}"`);
    }
  }
  return out;
}

/** Networks that still need an account xpub (at least one asset on them uses HD addresses). */
export function networksNeedingXpub(fixed: FixedAddresses): Set<BlockchainNetwork> {
  const needed = new Set<BlockchainNetwork>();
  for (const asset of Object.values(AssetType)) {
    if (!fixed[asset]) needed.add(ASSET_NETWORK[asset]);
  }
  return needed;
}
