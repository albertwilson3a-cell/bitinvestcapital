import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAddress } from 'ethers';
import { AssetType, BlockchainNetwork, Prisma } from '../generated/prisma/client.js';
import { ASSET_DECIMALS } from '../wallets/chains.js';

const D = Prisma.Decimal;

/** keccak256("Transfer(address,address,uint256)") */
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface ChainLookup {
  /** found: the transaction exists; paysAddress: some of it went to the platform address. */
  status: 'found' | 'not_found' | 'unavailable';
  paysAddress: boolean;
  /** Total received by the platform address in this transaction, in the asset's units. */
  amountToAddress: string | null;
  confirmations: number;
  confirmed: boolean;
  /** Sender(s) as seen on-chain. */
  from: string[];
  failed: boolean;
  message: string | null;
  checkedAt: string;
}

type Fetch = typeof fetch;

/**
 * Looks up a reported deposit on a public block explorer / RPC so reviewers
 * can see what actually arrived. Advisory only: the reviewer still decides,
 * and an unreachable explorer never blocks a review.
 */
@Injectable()
export class ChainLookupService {
  private readonly logger = new Logger(ChainLookupService.name);
  private readonly ethRpc: string;
  private readonly esplora: string;
  private readonly usdtContract: string;
  /** Replaced in tests. */
  fetcher: Fetch = (...a) => fetch(...a);

  constructor(config: ConfigService) {
    const testnet = config.get<string>('BTC_NETWORK') === 'testnet';
    this.ethRpc = config.get<string>('ETH_RPC_URL') || 'https://ethereum-rpc.publicnode.com';
    this.esplora = (config.get<string>('BTC_ESPLORA_URL') || (testnet ? 'https://mempool.space/testnet/api' : 'https://mempool.space/api')).replace(/\/$/, '');
    this.usdtContract = (config.get<string>('USDT_CONTRACT_ADDRESS') ?? '').toLowerCase();
  }

  async inspect(network: BlockchainNetwork, asset: AssetType, txHash: string, address: string): Promise<ChainLookup> {
    try {
      return network === BlockchainNetwork.BITCOIN ? await this.bitcoin(txHash, address) : await this.ethereum(asset, txHash, address);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Chain lookup failed for ${txHash}: ${message}`);
      return this.result({ status: 'unavailable', message: 'The block explorer could not be reached. Check the transaction with the explorer link instead.' });
    }
  }

  private result(p: Partial<ChainLookup> & Pick<ChainLookup, 'status'>): ChainLookup {
    return { paysAddress: false, amountToAddress: null, confirmations: 0, confirmed: false, from: [], failed: false, message: null, checkedAt: new Date().toISOString(), ...p };
  }

  // ── Bitcoin (Esplora API: mempool.space / blockstream.info) ────────

  private async bitcoin(txHash: string, address: string): Promise<ChainLookup> {
    const res = await this.fetcher(`${this.esplora}/tx/${txHash}`, { signal: AbortSignal.timeout(8000) });
    if (res.status === 404 || res.status === 400) return this.result({ status: 'not_found', message: 'No Bitcoin transaction with this ID was found.' });
    if (!res.ok) throw new Error(`esplora HTTP ${res.status}`);
    const tx = (await res.json()) as {
      vin: { prevout?: { scriptpubkey_address?: string } }[];
      vout: { scriptpubkey_address?: string; value: number }[];
      status: { confirmed: boolean; block_height?: number };
    };
    const target = address.toLowerCase();
    const sats = tx.vout.filter((o) => o.scriptpubkey_address?.toLowerCase() === target).reduce((sum, o) => sum + o.value, 0);
    let confirmations = 0;
    if (tx.status.confirmed && tx.status.block_height) {
      const tip = await this.fetcher(`${this.esplora}/blocks/tip/height`, { signal: AbortSignal.timeout(8000) });
      if (tip.ok) confirmations = Number(await tip.text()) - tx.status.block_height + 1;
    }
    const from = [...new Set(tx.vin.map((i) => i.prevout?.scriptpubkey_address).filter((a): a is string => !!a))];
    return this.result({
      status: 'found',
      paysAddress: sats > 0,
      amountToAddress: sats > 0 ? new D(sats).div(1e8).toFixed() : '0',
      confirmations,
      confirmed: tx.status.confirmed,
      from,
      message: sats > 0 ? null : 'This transaction does not pay the platform BTC address.',
    });
  }

  // ── Ethereum (JSON-RPC) ────────────────────────────────────────────

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const res = await this.fetcher(this.ethRpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`rpc HTTP ${res.status}`);
    const body = (await res.json()) as { result?: T; error?: { message: string } };
    if (body.error) throw new Error(`rpc ${method}: ${body.error.message}`);
    return body.result as T;
  }

  private async ethereum(asset: AssetType, txHash: string, address: string): Promise<ChainLookup> {
    const tx = await this.rpc<{ from: string; to: string | null; value: string; blockNumber: string | null } | null>('eth_getTransactionByHash', [txHash]);
    if (!tx) return this.result({ status: 'not_found', message: 'No Ethereum transaction with this hash was found.' });
    const receipt = tx.blockNumber
      ? await this.rpc<{ status: string; logs: { address: string; topics: string[]; data: string }[] } | null>('eth_getTransactionReceipt', [txHash])
      : null;
    let confirmations = 0;
    if (tx.blockNumber) {
      const head = await this.rpc<string>('eth_blockNumber', []);
      confirmations = Number(BigInt(head) - BigInt(tx.blockNumber) + 1n);
    }
    const failed = receipt?.status === '0x0';
    const target = address.toLowerCase();
    let units = 0n;
    if (asset === AssetType.ETH) {
      if (tx.to?.toLowerCase() === target) units = BigInt(tx.value);
    } else {
      const padded = '0x' + target.slice(2).padStart(64, '0');
      for (const log of receipt?.logs ?? []) {
        if (log.address.toLowerCase() === this.usdtContract && log.topics[0] === TRANSFER_TOPIC && log.topics[2]?.toLowerCase() === padded) {
          units += BigInt(log.data);
        }
      }
    }
    const amount = new D(units.toString()).div(new D(10).pow(ASSET_DECIMALS[asset])).toFixed();
    const pays = units > 0n && !failed;
    let message: string | null = null;
    if (failed) message = 'This transaction failed on-chain; nothing was received.';
    else if (!tx.blockNumber) message = 'The transaction is still waiting to be included in a block.';
    else if (!pays) message = asset === AssetType.USDT ? 'No official USDT transfer to the platform address in this transaction.' : 'This transaction does not send ETH to the platform address.';
    return this.result({
      status: 'found',
      paysAddress: pays,
      amountToAddress: amount,
      confirmations,
      confirmed: !!tx.blockNumber && !failed,
      from: [getAddress(tx.from)],
      failed,
      message,
    });
  }
}
