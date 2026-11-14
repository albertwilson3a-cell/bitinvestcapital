import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ecc from '@bitcoinerlab/secp256k1';
import { BIP32Factory, type BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import bs58check from 'bs58check';
import { HDNodeVoidWallet, HDNodeWallet } from 'ethers';
import { BlockchainNetwork } from '../generated/prisma/client.js';
import { btcNetworkFor } from './chains.js';
import { networksNeedingXpub, readFixedAddresses } from './fixed-addresses.js';

export interface DerivedAddress {
  address: string;
  path: string;
}

/** Highest non-hardened child index (BIP32). */
export const MAX_DERIVATION_INDEX = 0x7fffffff;
const EXTERNAL_CHAIN = 0;

const bip32 = BIP32Factory(ecc);

/** Account xpubs of the public "abandon … about" BIP test mnemonic: dev/test only. */
export const PUBLIC_TEST_XPUBS = new Set([
  'xpub6DCoCpSuQZB2jawqnGMEPS63ePKWkwWPH4TU45Q7LPXWuNd8TMtVxRrgjtEshuqpK3mdhaWHPFsBngh5GFZaM6si3yZdUsT8ddYM3PwnATt',
  'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
]);

/**
 * Re-encodes SLIP-132 variants (zpub/vpub/…) to the plain BIP32 public version
 * bytes of the target network so bip32 can parse them. The key material is unchanged.
 */
export function toBip32Public(extendedKey: string, network: bitcoin.Network): string {
  const decoded = bs58check.decode(extendedKey);
  if (decoded.length !== 78) throw new Error('Malformed extended key');
  const out = new Uint8Array(decoded);
  const v = network.bip32.public;
  out.set([(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff], 0);
  return bs58check.encode(out);
}

/**
 * Watch-only address derivation from account-level extended PUBLIC keys.
 * Addresses are m/<account>/0/<index>. This service can never sign or spend.
 */
@Injectable()
export class HdDerivationService {
  private readonly logger = new Logger(HdDerivationService.name);
  private readonly evmAccount: HDNodeVoidWallet | null = null;
  private readonly btcAccount: BIP32Interface | null = null;
  private readonly btcNetwork: bitcoin.Network;
  private readonly evmPath: string;
  private readonly btcPath: string;

  constructor(config: ConfigService) {
    this.evmPath = config.get<string>('ETH_ACCOUNT_PATH') ?? "m/44'/60'/0'";
    this.btcPath = config.get<string>('BTC_ACCOUNT_PATH') ?? "m/84'/0'/0'";
    this.btcNetwork = btcNetworkFor(config.get<string>('BTC_NETWORK') ?? 'mainnet');

    // Assets with a shared deposit address (DEPOSIT_ADDRESS_*) need no xpub.
    const needed = networksNeedingXpub(readFixedAddresses(config));
    const production = config.get<string>('NODE_ENV') === 'production';

    if (needed.has(BlockchainNetwork.ETHEREUM)) {
      const ethXpub = config.get<string>('ETH_ACCOUNT_XPUB');
      if (!ethXpub) throw new Error('ETH_ACCOUNT_XPUB is required unless DEPOSIT_ADDRESS_ETH and DEPOSIT_ADDRESS_USDT are both set.');
      this.checkTestKey(ethXpub, production);
      const evm = HDNodeWallet.fromExtendedKey(ethXpub);
      if (!(evm instanceof HDNodeVoidWallet)) {
        throw new Error('ETH_ACCOUNT_XPUB contains a private key. Supply the neutered xpub only.');
      }
      if (evm.depth !== 3) this.logger.warn(`ETH account xpub depth is ${evm.depth}; expected 3 (account level).`);
      this.evmAccount = evm;
    }

    if (needed.has(BlockchainNetwork.BITCOIN)) {
      const btcXpub = config.get<string>('BTC_ACCOUNT_XPUB');
      if (!btcXpub) throw new Error('BTC_ACCOUNT_XPUB is required unless DEPOSIT_ADDRESS_BTC is set.');
      this.checkTestKey(btcXpub, production);
      const btc = bip32.fromBase58(toBip32Public(btcXpub, this.btcNetwork), this.btcNetwork);
      if (!btc.isNeutered()) {
        throw new Error('BTC_ACCOUNT_XPUB contains a private key. Supply the neutered xpub only.');
      }
      if (btc.depth !== 3) this.logger.warn(`BTC account xpub depth is ${btc.depth}; expected 3 (account level).`);
      this.btcAccount = btc;
    }
  }

  private checkTestKey(xpub: string, production: boolean) {
    if (!PUBLIC_TEST_XPUBS.has(xpub)) return;
    if (production) throw new Error('Refusing to start: account xpubs come from the public BIP test mnemonic.');
    this.logger.warn('Using PUBLIC TEST xpubs. Anyone can spend funds sent to these addresses. Dev only.');
  }

  /** Whether per-client addresses can be derived on this network. */
  isEnabled(network: BlockchainNetwork): boolean {
    return network === BlockchainNetwork.ETHEREUM ? !!this.evmAccount : !!this.btcAccount;
  }

  derive(network: BlockchainNetwork, index: number): DerivedAddress {
    if (!Number.isInteger(index) || index < 0 || index > MAX_DERIVATION_INDEX) {
      throw new RangeError(`Derivation index out of range: ${index}`);
    }
    if (network === BlockchainNetwork.ETHEREUM) {
      if (!this.evmAccount) throw new Error('No ETH account xpub configured');
      const child = this.evmAccount.deriveChild(EXTERNAL_CHAIN).deriveChild(index);
      return { address: child.address, path: `${this.evmPath}/${EXTERNAL_CHAIN}/${index}` };
    }
    if (!this.btcAccount) throw new Error('No BTC account xpub configured');
    const child = this.btcAccount.derive(EXTERNAL_CHAIN).derive(index);
    const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: this.btcNetwork });
    if (!address) throw new Error('Failed to derive P2WPKH address');
    return { address, path: `${this.btcPath}/${EXTERNAL_CHAIN}/${index}` };
  }

  get bitcoinNetwork(): bitcoin.Network {
    return this.btcNetwork;
  }
}
