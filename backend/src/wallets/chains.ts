import * as bitcoin from 'bitcoinjs-lib';
import { getAddress } from 'ethers';
import { AssetType, BlockchainNetwork } from '../generated/prisma/client.js';

/** Which chain each asset settles on. USDT is the ERC-20 token on Ethereum. */
export const ASSET_NETWORK: Record<AssetType, BlockchainNetwork> = {
  [AssetType.ETH]: BlockchainNetwork.ETHEREUM,
  [AssetType.USDT]: BlockchainNetwork.ETHEREUM,
  [AssetType.BTC]: BlockchainNetwork.BITCOIN,
};

/** On-chain precision; amounts with more decimals are rejected. */
export const ASSET_DECIMALS: Record<AssetType, number> = {
  [AssetType.ETH]: 18,
  [AssetType.USDT]: 6,
  [AssetType.BTC]: 8,
};

export function btcNetworkFor(name: string): bitcoin.Network {
  return name === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
}

export class InvalidAddressError extends Error {}

/**
 * Canonical form used for storage and lookup:
 * EVM → EIP-55 checksum; BTC → validated for the configured network, bech32 lower-cased.
 */
export function normalizeAddress(network: BlockchainNetwork, raw: string, btcNetwork: bitcoin.Network): string {
  const value = raw.trim();
  if (network === BlockchainNetwork.ETHEREUM) {
    try {
      return getAddress(value.toLowerCase());
    } catch {
      throw new InvalidAddressError('Invalid EVM address');
    }
  }
  try {
    bitcoin.address.toOutputScript(value, btcNetwork);
  } catch {
    throw new InvalidAddressError('Invalid Bitcoin address for the configured network');
  }
  return /^(bc1|tb1|bcrt1)/i.test(value) ? value.toLowerCase() : value;
}
