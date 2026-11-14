import { BlockchainNetwork } from '../generated/prisma/client.js';
import { validateEnv } from '../config/env.validation.js';
import { networksNeedingXpub, readFixedAddresses } from './fixed-addresses.js';

const BTC = 'bc1q84ma6k9jpmtj7m94fxy5jhufcp0hr68fqx9xvf';
const ETH = '0x86EF1E2Fb0454218d3eADe4aBCfD359F24B8068e';
const cfg = (env: Record<string, string>) => ({ get: <T>(k: string) => env[k] as T });

describe('shared deposit addresses', () => {
  it('normalises addresses (checksum for EVM, lower-case bech32)', () => {
    expect(readFixedAddresses(cfg({ DEPOSIT_ADDRESS_BTC: BTC.toUpperCase(), DEPOSIT_ADDRESS_USDT: ETH.toLowerCase() }))).toEqual({ BTC, USDT: ETH });
  });

  it('refuses an address for the wrong chain or with a bad checksum', () => {
    expect(() => readFixedAddresses(cfg({ DEPOSIT_ADDRESS_BTC: ETH }))).toThrow(/DEPOSIT_ADDRESS_BTC must be a Bitcoin address/);
    expect(() => readFixedAddresses(cfg({ DEPOSIT_ADDRESS_ETH: 'bc1qnotanaddress' }))).toThrow(/Ethereum/);
    expect(() => readFixedAddresses(cfg({ DEPOSIT_ADDRESS_BTC: BTC.slice(0, -1) + 'q' }))).toThrow(/Bitcoin/);
  });

  it('only asks for an xpub on networks that still derive per-client addresses', () => {
    expect([...networksNeedingXpub({ BTC, ETH, USDT: ETH })]).toEqual([]);
    expect([...networksNeedingXpub({ BTC, ETH })]).toEqual([BlockchainNetwork.ETHEREUM]);
    expect([...networksNeedingXpub({})].sort()).toEqual([BlockchainNetwork.ETHEREUM, BlockchainNetwork.BITCOIN].sort());
  });

  describe('startup validation', () => {
    const base = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://u:p@db:5432/app',
      REDIS_CLUSTER_NODES: 'r:6379',
      JWT_SECRET: 'x'.repeat(64),
      WEBHOOK_SIGNING_SECRETS: 'whsec_' + 'y'.repeat(40),
      USDT_CONTRACT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      FRONTEND_URL: 'https://bitinvestcapital.com',
      MAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      MAIL_FROM_ADDRESS: 'no-reply@bitinvestcapital.com',
      PRICE_PROVIDER: 'coingecko',
    };
    const run = (extra: Record<string, string>) => {
      try {
        validateEnv({ ...base, ...extra });
        return 'ok';
      } catch (e) {
        return (e as Error).message;
      }
    };

    it('accepts production with all three shared addresses and no xpubs', () => {
      const r = run({ DEPOSIT_ADDRESS_BTC: BTC, DEPOSIT_ADDRESS_ETH: ETH, DEPOSIT_ADDRESS_USDT: ETH });
      // Other unrelated required variables may be reported, but never the xpubs or addresses.
      expect(r).toBe('ok');
    });

    it('still requires an xpub for a network without a shared address', () => {
      expect(run({ DEPOSIT_ADDRESS_BTC: BTC })).toMatch(/ETH_ACCOUNT_XPUB is required/);
      expect(run({ DEPOSIT_ADDRESS_ETH: ETH, DEPOSIT_ADDRESS_USDT: ETH })).toMatch(/BTC_ACCOUNT_XPUB is required/);
    });

    it('refuses a malformed shared address at startup', () => {
      expect(run({ DEPOSIT_ADDRESS_BTC: ETH, DEPOSIT_ADDRESS_ETH: ETH, DEPOSIT_ADDRESS_USDT: ETH })).toMatch(/DEPOSIT_ADDRESS_BTC must be a Bitcoin address/);
    });
  });
});
