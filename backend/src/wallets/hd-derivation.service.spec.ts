import { ConfigService } from '@nestjs/config';
import { HDNodeWallet } from 'ethers';
import { BlockchainNetwork } from '../generated/prisma/client.js';
import { HdDerivationService } from './hd-derivation.service.js';

// Public BIP test mnemonic — never use for real funds.
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const TEST_ETH_XPUB = HDNodeWallet.fromPhrase(MNEMONIC, undefined, "m/44'/60'/0'").neuter().extendedKey;
// BIP84 test vector account zpub for the same mnemonic.
export const TEST_BTC_ZPUB =
  'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';

const make = (overrides: Record<string, string> = {}) =>
  new HdDerivationService(
    new ConfigService({ ETH_ACCOUNT_XPUB: TEST_ETH_XPUB, BTC_ACCOUNT_XPUB: TEST_BTC_ZPUB, BTC_NETWORK: 'mainnet', ...overrides }),
  );

describe('HdDerivationService', () => {
  const svc = make();

  it('matches the BIP44 Ethereum vector (m/44\'/60\'/0\'/0/0)', () => {
    expect(svc.derive(BlockchainNetwork.ETHEREUM, 0)).toEqual({
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      path: "m/44'/60'/0'/0/0",
    });
  });

  it('matches the BIP84 Bitcoin vectors (m/84\'/0\'/0\'/0/0 and /1)', () => {
    expect(svc.derive(BlockchainNetwork.BITCOIN, 0).address).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    expect(svc.derive(BlockchainNetwork.BITCOIN, 1).address).toBe('bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g');
  });

  it('derives distinct addresses per index', () => {
    const set = new Set(Array.from({ length: 50 }, (_, i) => svc.derive(BlockchainNetwork.ETHEREUM, i).address));
    expect(set.size).toBe(50);
  });

  it('refuses private extended keys', () => {
    const xprv = HDNodeWallet.fromPhrase(MNEMONIC, undefined, "m/44'/60'/0'").extendedKey;
    expect(() => make({ ETH_ACCOUNT_XPUB: xprv })).toThrow(/private key/);
  });

  it('rejects out-of-range indices', () => {
    expect(() => svc.derive(BlockchainNetwork.ETHEREUM, -1)).toThrow(RangeError);
    expect(() => svc.derive(BlockchainNetwork.ETHEREUM, 2 ** 31)).toThrow(RangeError);
  });
});
