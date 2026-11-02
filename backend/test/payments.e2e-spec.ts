import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { loginWithCode } from './support/login.js';
import type { App } from 'supertest/types.js';
import type { PrismaService as PrismaServiceType } from '../src/prisma/prisma.service.js';
import type { HdDerivationService as HdType } from '../src/wallets/hd-derivation.service.js';

// Requires Postgres + Redis cluster and applied migrations (see README).

const RUN = Date.now().toString(36);
const DOMAIN = `pay-${RUN}.test`;
const PASSWORD = 'Str0ngPassw0rd';
const SECRET = 'whsec_' + 'k'.repeat(40);
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const prices: Record<string, string> = { BTC: '50000', ETH: '2500', USDT: '1' };
let priceDown = false;

describe('Wallets, webhook security & ledger (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaServiceType;
  let savedSettings: { key: string; value: string }[] = [];
  let hd: HdType;
  let sign: (secret: string, body: string, t?: number) => string;
  let Decimal: typeof import('../src/generated/prisma/client.js').Prisma.Decimal;

  const users: Record<string, { id: string; jwt: string }> = {};
  const evtIds: string[] = [];

  const http = () => request(app.getHttpServer());
  const evmHash = () => '0x' + randomBytes(32).toString('hex');
  const btcHash = () => randomBytes(32).toString('hex');

  function event(type: string, data: Record<string, unknown>, id = `evt_${RUN}_${randomBytes(6).toString('hex')}`) {
    evtIds.push(id);
    return { id, type, createdAt: new Date().toISOString(), data };
  }

  function post(payload: object, opts: { secret?: string; t?: number; header?: string; rawOverride?: string } = {}) {
    const body = JSON.stringify(payload);
    const header = opts.header ?? sign(opts.secret ?? SECRET, body, opts.t);
    return http()
      .post('/payments/webhook')
      .set('content-type', 'application/json')
      .set('x-webhook-signature', header)
      .send(opts.rawOverride ?? body);
  }

  async function makeUser(name: string, referralCode?: string) {
    const email = `${name}@${DOMAIN}`;
    await http().post('/api/auth/register').send({ email, password: PASSWORD, referralCode }).expect(201);
    await prisma.user.update({ where: { email }, data: { isVerified: true, verificationToken: null } });
    const login = await loginWithCode(app, email, PASSWORD);
    users[name] = { id: login.body.user.id, jwt: login.body.accessToken };
    return login.body.user as { id: string; referralCode: string };
  }

  async function address(name: string, asset: string): Promise<string> {
    const res = await http()
      .get(`/api/wallets/${asset}/deposit-address`)
      .set('Authorization', `Bearer ${users[name].jwt}`)
      .expect(200);
    return res.body.address;
  }

  const bal = async (name: string, asset: 'USDT' | 'ETH' | 'BTC') =>
    (
      await prisma.balance.findUniqueOrThrow({
        where: { userId_assetType: { userId: users[name].id, assetType: asset } },
      })
    ).balance.toString();

  beforeAll(async () => {
    Object.assign(process.env, {
      BCRYPT_ROUNDS: '4',
      MAIL_PROVIDER: 'log',
      WEBHOOK_SIGNING_SECRETS: `${SECRET},${'r'.repeat(40)}`,
      MIN_CONFIRMATIONS_BTC: '3',
      MIN_CONFIRMATIONS_ETH: '12',
      MIN_CONFIRMATIONS_USDT: '12',
      REFERRAL_REWARD_RATE: '0.01',
      USDT_CONTRACT_ADDRESS: USDT,
      REDIS_NAT_MAP: process.env.REDIS_NAT_MAP ?? '',
    });
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/app.setup.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const { PriceService, PriceUnavailableError } = await import('../src/payments/price.service.js');
    const { HdDerivationService } = await import('../src/wallets/hd-derivation.service.js');
    const { MAIL_TRANSPORT } = await import('../src/mail/mail.types.js');
    ({ signWebhookPayload: sign } = await import('../src/payments/webhook-signature.js'));
    Decimal = (await import('../src/generated/prisma/client.js')).Prisma.Decimal;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PriceService)
      .useValue({
        getUsdPrice: async (asset: string) => {
          if (priceDown && asset !== 'USDT') throw new PriceUnavailableError('down');
          return new Decimal(prices[asset]);
        },
      })
      .overrideProvider(MAIL_TRANSPORT)
      .useValue({ name: 'noop', send: async () => ({ provider: 'noop' }) })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    // Admin-set referral rates live in the database; run against the env defaults
    // and restore whatever was configured afterwards.
    savedSettings = await prisma.platformSetting.findMany();
    await prisma.platformSetting.deleteMany({});
    hd = app.get(HdDerivationService);

    const referrer = await makeUser('referrer');
    await makeUser('alice', referrer.referralCode);
    await makeUser('bob');
    await makeUser('carol', referrer.referralCode);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.platformSetting.deleteMany({});
      for (const s of savedSettings) await prisma.platformSetting.create({ data: { key: s.key, value: s.value } });
      const ids = Object.values(users).map((u) => u.id);
      await prisma.transaction.deleteMany({ where: { userId: { in: ids }, sourceTransactionId: { not: null } } });
      await prisma.transaction.deleteMany({ where: { userId: { in: ids } } });
      await prisma.depositAddress.deleteMany({ where: { userId: { in: ids } } });
      await prisma.webhookEvent.deleteMany({ where: { id: { in: evtIds } } });
      await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` }, referredByUserId: { not: null } } });
      await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    }
    await app?.close();
  });

  // ───────────────────────── deposit addresses ─────────────────────────

  describe('deposit addresses', () => {
    it('gives each user a dedicated, unique address per asset, derived from the xpub', async () => {
      const res = await http().get('/api/wallets').set('Authorization', `Bearer ${users.alice.jwt}`).expect(200);
      expect(res.body.map((w: { asset: string }) => w.asset).sort()).toEqual(['BTC', 'ETH', 'USDT']);
      const byAsset = Object.fromEntries(res.body.map((w: { asset: string }) => [w.asset, w]));
      expect(byAsset.ETH.depositAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(byAsset.USDT.depositAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(byAsset.BTC.depositAddress).toMatch(/^bc1q[0-9a-z]{38}$/);
      expect(new Set([byAsset.ETH.depositAddress, byAsset.USDT.depositAddress]).size).toBe(2);
      expect(byAsset.BTC.requiredConfirmations).toBe(3);
      expect(byAsset.USDT.balance).toBe('0');

      const rows = await prisma.depositAddress.findMany({ where: { userId: users.alice.id } });
      for (const row of rows) expect(hd.derive(row.network, row.derivationIndex).address).toBe(row.address);

      const bobEth = await address('bob', 'ETH');
      expect(bobEth).not.toBe(byAsset.ETH.depositAddress);
      expect(await address('alice', 'eth')).toBe(byAsset.ETH.depositAddress); // stable + case-insensitive param
    });

    it('creates exactly one address under concurrent first requests', async () => {
      const results = await Promise.all(Array.from({ length: 12 }, () => address('carol', 'BTC')));
      expect(new Set(results).size).toBe(1);
      expect(await prisma.depositAddress.count({ where: { userId: users.carol.id, assetType: 'BTC' } })).toBe(1);
    });

    it('requires auth and validates the asset param', async () => {
      await http().get('/api/wallets').expect(401);
      const res = await http()
        .get('/api/wallets/DOGE/deposit-address')
        .set('Authorization', `Bearer ${users.alice.jwt}`)
        .expect(400);
      expect(res.body.message[0]).toMatch(/asset must be one of/);
    });
  });

  // ───────────────────────── webhook security ─────────────────────────

  describe('webhook signature validation', () => {
    let payload: object;
    beforeAll(async () => {
      payload = event('deposit.confirmed', {
        network: 'ethereum', asset: 'USDT', txHash: evmHash(), outputIndex: 0,
        toAddress: await address('bob', 'USDT'), amount: '500', confirmations: 20, blockNumber: 1, contractAddress: USDT,
      });
    });

    it('rejects missing, forged, stale and tampered requests with 401 and credits nothing', async () => {
      const body = JSON.stringify(payload);
      await http().post('/payments/webhook').set('content-type', 'application/json').send(body).expect(401);
      await post(payload, { secret: 'attacker-secret-'.padEnd(40, 'x') }).expect(401);
      await post(payload, { t: Math.floor(Date.now() / 1000) - 3600 }).expect(401);
      await post(payload, { header: `t=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}` }).expect(401);
      const tampered = body.replace('"amount":"500"', '"amount":"5000000"');
      const res = await post(payload, { rawOverride: tampered }).expect(401);
      expect(res.body.message).toBe('Invalid webhook signature');
      expect(await bal('bob', 'USDT')).toBe('0');
    });

    it('accepts the rotated (secondary) secret', async () => {
      const res = await post(payload, { secret: 'r'.repeat(40) }).expect(200);
      expect(res.body.outcome.status).toBe('credited');
      expect(await bal('bob', 'USDT')).toBe('500');
    });

    it('rejects signed-but-malformed payloads with 400', async () => {
      const bad = event('deposit.confirmed', { network: 'ethereum', asset: 'USDT', amount: 1.5 });
      const res = await post(bad).expect(400);
      expect(res.body.message.join(' ')).toMatch(/txHash|amount/);
    });

    it('acknowledges unknown event types once', async () => {
      const ping = event('provider.ping', {});
      expect((await post(ping).expect(200)).body.outcome).toEqual({ status: 'ignored', reason: 'unhandled_event_type' });
      expect((await post(ping).expect(200)).body.outcome.status).toBe('duplicate_event');
    });
  });

  // ───────────────────────── ledger ─────────────────────────

  describe('ledger: crediting deposits and referral rewards', () => {
    it('credits a confirmed USDT deposit and pays 1% to the referrer in USDT', async () => {
      const to = await address('alice', 'USDT');
      const p = event('deposit.confirmed', {
        network: 'ethereum', asset: 'USDT', txHash: evmHash(), outputIndex: 3, toAddress: to.toLowerCase(),
        amount: '1000', confirmations: 15, blockNumber: 19_000_000, contractAddress: USDT.toLowerCase(),
        fromAddress: '0x000000000000000000000000000000000000dEaD',
      });
      const res = await post(p).expect(200);
      expect(res.body.outcome).toMatchObject({ status: 'credited', asset: 'USDT', amount: '1000', userId: users.alice.id });
      expect(res.body.outcome.referralBonus).toMatchObject({ referrerId: users.referrer.id, amountUsdt: '10' });

      expect(await bal('alice', 'USDT')).toBe('1000');
      expect(await bal('referrer', 'USDT')).toBe('10');

      const bonus = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.outcome.referralBonus.transactionId } });
      expect(bonus).toMatchObject({
        type: 'REFERRAL_BONUS', assetType: 'USDT', status: 'COMPLETED',
        userId: users.referrer.id, sourceTransactionId: res.body.outcome.transactionId,
      });
      expect(bonus.amount.toString()).toBe('10');

      const referral = await prisma.referral.findUniqueOrThrow({ where: { refereeId: users.alice.id } });
      expect(referral.totalCommissionEarned.toString()).toBe('10');
      expect(referral.registrationStatus).toBe('QUALIFIED');

      const evt = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: (p as { id: string }).id } });
      expect(evt.status).toBe('PROCESSED');
    });

    it('is idempotent: replayed event ids and re-announced transfers never double-credit', async () => {
      const to = await address('alice', 'ETH');
      const data = { network: 'ethereum', asset: 'ETH', txHash: evmHash(), outputIndex: 0, toAddress: to, amount: '2', confirmations: 12, blockNumber: 5 };
      const p = event('deposit.confirmed', data);
      expect((await post(p).expect(200)).body.outcome.status).toBe('credited');
      expect((await post(p).expect(200)).body.outcome.status).toBe('duplicate_event');
      expect((await post(event('deposit.confirmed', { ...data, confirmations: 40 })).expect(200)).body.outcome.status).toBe('already_credited');
      expect(await bal('alice', 'ETH')).toBe('2');
      // 2 ETH × $2500 × 1% = 50 USDT, on top of the earlier 10
      expect(await bal('referrer', 'USDT')).toBe('60');
    });

    it('holds BTC deposits as pending until confirmations are reached, then credits once', async () => {
      const to = await address('carol', 'BTC');
      const data = { network: 'bitcoin', asset: 'BTC', txHash: btcHash(), outputIndex: 1, toAddress: to.toUpperCase(), amount: '0.5', blockNumber: 870_000 };

      const pending = await post(event('deposit.pending', { ...data, confirmations: 0 })).expect(200);
      expect(pending.body.outcome).toMatchObject({ status: 'pending', requiredConfirmations: 3 });
      const notYet = await post(event('deposit.confirmed', { ...data, confirmations: 2 })).expect(200);
      expect(notYet.body.outcome.status).toBe('pending');
      expect(await bal('carol', 'BTC')).toBe('0');

      // A "confirmation" claiming a different amount for the same output is refused.
      const forged = await post(event('deposit.confirmed', { ...data, amount: '50', confirmations: 6 })).expect(200);
      expect(forged.body.outcome).toEqual({ status: 'ignored', reason: 'conflicts_with_recorded_transfer' });

      const done = await post(event('deposit.confirmed', { ...data, confirmations: 3 })).expect(200);
      expect(done.body.outcome.status).toBe('credited');
      expect(done.body.outcome.transactionId).toBe(pending.body.outcome.transactionId);
      expect(await bal('carol', 'BTC')).toBe('0.5');
      // 0.5 BTC × $50,000 × 1% = 250 USDT
      expect(done.body.outcome.referralBonus.amountUsdt).toBe('250');
      expect(await bal('referrer', 'USDT')).toBe('310');
    });

    it('pays no referral bonus when the depositor was not referred', async () => {
      const res = await post(event('deposit.confirmed', {
        network: 'ethereum', asset: 'ETH', txHash: evmHash(), outputIndex: 0,
        toAddress: await address('bob', 'ETH'), amount: '1.25', confirmations: 30, blockNumber: 9,
      })).expect(200);
      expect(res.body.outcome).toMatchObject({ status: 'credited', referralBonus: null });
      expect(await prisma.transaction.count({ where: { sourceTransactionId: res.body.outcome.transactionId } })).toBe(0);
    });

    it.each([
      ['a fake USDT token contract', { asset: 'USDT', contractAddress: '0x' + '1'.repeat(40) }, 'untrusted_token_contract'],
      ['USDT without a contract', { asset: 'USDT' }, 'untrusted_token_contract'],
      ['an address we never issued', { asset: 'ETH', toAddress: '0x' + '2'.repeat(40) }, 'unknown_deposit_address'],
      ['BTC claimed on the ethereum network', { asset: 'BTC' }, 'asset_network_mismatch'],
      ['more decimals than USDT supports', { asset: 'USDT', contractAddress: USDT, amount: '1.0000001' }, 'invalid_amount'],
      ['a zero amount', { asset: 'ETH', amount: '0' }, 'invalid_amount'],
    ])('ignores (and never credits) %s', async (_, overrides, reason) => {
      const before = await bal('bob', 'USDT');
      const res = await post(event('deposit.confirmed', {
        network: 'ethereum', txHash: evmHash(), outputIndex: 0, toAddress: await address('bob', 'USDT'),
        amount: '100', confirmations: 50, blockNumber: 1, ...overrides,
      })).expect(200);
      expect(res.body.outcome).toEqual({ status: 'ignored', reason });
      expect(await bal('bob', 'USDT')).toBe(before);
    });

    it('returns 503 without crediting when a price is needed but unavailable, then succeeds on retry', async () => {
      const p = event('deposit.confirmed', {
        network: 'ethereum', asset: 'ETH', txHash: evmHash(), outputIndex: 0,
        toAddress: await address('alice', 'ETH'), amount: '1', confirmations: 20, blockNumber: 10,
      });
      priceDown = true;
      await post(p).expect(503);
      expect(await bal('alice', 'ETH')).toBe('2');
      expect(await prisma.webhookEvent.findUnique({ where: { id: (p as { id: string }).id } })).toBeNull();
      priceDown = false;
      expect((await post(p).expect(200)).body.outcome.status).toBe('credited');
      expect(await bal('alice', 'ETH')).toBe('3');
    });
  });

  // ───────────────────────── race conditions ─────────────────────────

  describe('concurrency', () => {
    it('credits a transfer exactly once when 20 different events for it arrive simultaneously', async () => {
      const data = {
        network: 'ethereum', asset: 'USDT', txHash: evmHash(), outputIndex: 7,
        toAddress: await address('carol', 'USDT'), amount: '200', confirmations: 12, blockNumber: 11, contractAddress: USDT,
      };
      const referrerBefore = new Decimal(await bal('referrer', 'USDT'));
      const results = await Promise.all(Array.from({ length: 20 }, () => post(event('deposit.confirmed', data))));
      const statuses = results.map((r) => r.body.outcome?.status);
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(statuses.filter((s) => s === 'credited')).toHaveLength(1);
      expect(statuses.filter((s) => s === 'already_credited')).toHaveLength(19);
      expect(await bal('carol', 'USDT')).toBe('200');
      expect((await bal('referrer', 'USDT'))).toBe(referrerBefore.plus(2).toString());
    });

    it('completes a pending deposit exactly once when 20 confirmations race', async () => {
      const data = {
        network: 'ethereum', asset: 'ETH', txHash: evmHash(), outputIndex: 2,
        toAddress: await address('bob', 'ETH'), amount: '0.7', blockNumber: 12,
      };
      await post(event('deposit.pending', { ...data, confirmations: 1 })).expect(200);
      const before = new Decimal(await bal('bob', 'ETH'));
      const results = await Promise.all(
        Array.from({ length: 20 }, () => post(event('deposit.confirmed', { ...data, confirmations: 12 }))),
      );
      const statuses = results.map((r) => r.body.outcome?.status);
      expect(statuses.filter((s) => s === 'credited')).toHaveLength(1);
      expect(statuses.filter((s) => s === 'already_credited')).toHaveLength(19);
      expect(await bal('bob', 'ETH')).toBe(before.plus('0.7').toString());
    });

    it('applies 25 simultaneous distinct deposits to one wallet without losing any update', async () => {
      const to = await address('bob', 'BTC');
      const amounts = Array.from({ length: 25 }, (_, i) => `0.0${(i % 9) + 1}`);
      const results = await Promise.all(amounts.map((amount) => post(event('deposit.confirmed', {
        network: 'bitcoin', asset: 'BTC', txHash: btcHash(), outputIndex: 0, toAddress: to, amount, confirmations: 6, blockNumber: 1,
      }))));
      expect(results.every((r) => r.body.outcome?.status === 'credited')).toBe(true);
      const expected = amounts.reduce((s, a) => s.plus(a), new Decimal(0));
      expect(await bal('bob', 'BTC')).toBe(expected.toString());
    });
  });

  it('lists the transaction history with pagination', async () => {
    const page1 = await http().get('/api/wallets/transactions?limit=2').set('Authorization', `Bearer ${users.alice.jwt}`).expect(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.nextCursor).toBeTruthy();
    expect(typeof page1.body.items[0].blockNumber).toBe('string');
    const page2 = await http()
      .get(`/api/wallets/transactions?limit=2&cursor=${page1.body.nextCursor}`)
      .set('Authorization', `Bearer ${users.alice.jwt}`)
      .expect(200);
    expect(page2.body.items[0].id).not.toBe(page1.body.items[0].id);
    const bonuses = await http()
      .get('/api/wallets/transactions?type=referral_bonus')
      .set('Authorization', `Bearer ${users.referrer.jwt}`)
      .expect(200);
    expect(bonuses.body.items.length).toBeGreaterThanOrEqual(4);
  });
});
