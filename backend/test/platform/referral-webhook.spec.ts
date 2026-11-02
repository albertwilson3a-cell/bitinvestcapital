/**
 * Suite 3: Referral & webhook engine.
 * A signed payment-gateway webhook must credit the depositor exactly and pay the
 * direct referrer a 1% bonus in USDT, all through real database relations.
 */
import { Prisma } from '../../src/generated/prisma/client.js';
import {
  balanceOf,
  bootstrap,
  btcHash,
  eventId,
  evmHash,
  FIXED_PRICES,
  postWebhook,
  registerVerified,
  USDT_CONTRACT,
  type Harness,
} from './support/harness.js';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('Suite 3: Referral & webhook engine', () => {
  let h: Harness;
  let referrer: Awaited<ReturnType<typeof registerVerified>>;
  let client: Awaited<ReturnType<typeof registerVerified>>;
  let solo: Awaited<ReturnType<typeof registerVerified>>;
  const address = async (u: { auth: Record<string, string> }, asset: string) =>
    (await h.http().get(`/api/wallets/${asset}/deposit-address`).set(u.auth).expect(200)).body.address as string;

  beforeAll(async () => {
    h = await bootstrap();
    referrer = await registerVerified(h, 'referrer');
    client = await registerVerified(h, 'client', referrer.referralCode); // signs up with the referrer's code
    solo = await registerVerified(h, 'solo');
  });
  afterAll(async () => h?.close());

  it('links the referral relationship in the database at sign-up', async () => {
    const row = await h.prisma.user.findUniqueOrThrow({ where: { id: client.id }, include: { referralReceived: true } });
    expect(row.referredByUserId).toBe(referrer.id);
    expect(row.referralReceived).toMatchObject({ referrerId: referrer.id, registrationStatus: 'VERIFIED' });
  });

  describe('a confirmed USDT deposit with a valid signature', () => {
    let outcome: Record<string, unknown> & { referralBonus: { transactionId: string; amountUsdt: string; referrerId: string } };
    let depositId: string;
    const amount = '2500.75';

    beforeAll(async () => {
      const res = await postWebhook(h, {
        id: eventId(),
        type: 'deposit.confirmed',
        createdAt: new Date().toISOString(),
        data: {
          network: 'ethereum', asset: 'USDT', txHash: evmHash(), outputIndex: 4,
          toAddress: await address(client, 'USDT'), amount, confirmations: 14, blockNumber: 21_500_000, contractAddress: USDT_CONTRACT,
        },
      }).expect(200);
      outcome = res.body.outcome;
      depositId = outcome.transactionId as string;
    });

    it('credits the target wallet with the exact amount', async () => {
      expect(outcome).toMatchObject({ status: 'credited', userId: client.id, asset: 'USDT', amount });
      expect((await balanceOf(h, client.id, 'USDT')).balance.toString()).toBe(amount);
      const deposit = await h.prisma.transaction.findUniqueOrThrow({ where: { id: depositId } });
      expect(deposit).toMatchObject({ type: 'DEPOSIT', status: 'COMPLETED', userId: client.id, assetType: 'USDT' });
      expect(deposit.amount.toString()).toBe(amount);
    });

    it('detects the referrer and credits a 1% bonus to their USDT balance', async () => {
      const expected = D(amount).mul('0.01').toDecimalPlaces(6, Prisma.Decimal.ROUND_DOWN); // 25.0075
      expect(outcome.referralBonus).toMatchObject({ referrerId: referrer.id, amountUsdt: expected.toString() });
      expect((await balanceOf(h, referrer.id, 'USDT')).balance.toString()).toBe(expected.toString());
    });

    it('logs an official referral_bonus transaction linked to the deposit', async () => {
      const bonus = await h.prisma.transaction.findUniqueOrThrow({ where: { id: outcome.referralBonus.transactionId } });
      expect(bonus).toMatchObject({
        type: 'REFERRAL_BONUS', status: 'COMPLETED', userId: referrer.id, assetType: 'USDT', sourceTransactionId: depositId,
      });
      const referral = await h.prisma.referral.findUniqueOrThrow({ where: { refereeId: client.id } });
      expect(referral.totalCommissionEarned.toString()).toBe(bonus.amount.toString());
      expect(referral.registrationStatus).toBe('QUALIFIED');
    });

    it('shows the bonus in the referrer’s own activity', async () => {
      const res = await h.http().get('/api/wallets/transactions?type=REFERRAL_BONUS').set(referrer.auth).expect(200);
      expect(res.body.items[0]).toMatchObject({ id: outcome.referralBonus.transactionId, assetType: 'USDT', status: 'COMPLETED' });
    });
  });

  it('pays the bonus in USDT at the live price when the deposit is BTC', async () => {
    const before = (await balanceOf(h, referrer.id, 'USDT')).balance;
    const res = await postWebhook(h, {
      id: eventId(), type: 'deposit.confirmed', createdAt: new Date().toISOString(),
      data: { network: 'bitcoin', asset: 'BTC', txHash: btcHash(), outputIndex: 0, toAddress: await address(client, 'BTC'), amount: '0.125', confirmations: 3, blockNumber: 880_000 },
    }).expect(200);
    const bonus = D('0.125').mul(FIXED_PRICES.BTC).mul('0.01'); // 0.125 × 60,000 × 1% = 75
    expect(res.body.outcome.referralBonus.amountUsdt).toBe(bonus.toString());
    expect((await balanceOf(h, client.id, 'BTC')).balance.toString()).toBe('0.125');
    expect((await balanceOf(h, referrer.id, 'USDT')).balance.toString()).toBe(before.plus(bonus).toString());
    expect((await balanceOf(h, referrer.id, 'BTC')).balance.toString()).toBe('0'); // bonus is never paid in BTC
  });

  it('pays no bonus when the depositor has no referrer', async () => {
    const res = await postWebhook(h, {
      id: eventId(), type: 'deposit.confirmed', createdAt: new Date().toISOString(),
      data: { network: 'ethereum', asset: 'ETH', txHash: evmHash(), outputIndex: 0, toAddress: await address(solo, 'ETH'), amount: '1.5', confirmations: 20, blockNumber: 21_500_100 },
    }).expect(200);
    expect(res.body.outcome).toMatchObject({ status: 'credited', referralBonus: null });
    expect(await h.prisma.transaction.count({ where: { sourceTransactionId: res.body.outcome.transactionId } })).toBe(0);
  });

  describe('signature verification and idempotency', () => {
    const snapshot = async () =>
      Promise.all([balanceOf(h, client.id, 'USDT'), balanceOf(h, referrer.id, 'USDT')]).then((b) => b.map((x) => x.balance.toString()));

    it('rejects a payload signed with the wrong secret (401) and credits nothing', async () => {
      const before = await snapshot();
      const payload = {
        id: eventId(), type: 'deposit.confirmed', createdAt: new Date().toISOString(),
        data: { network: 'ethereum', asset: 'USDT', txHash: evmHash(), outputIndex: 0, toAddress: await address(client, 'USDT'), amount: '1000000', confirmations: 99, blockNumber: 1, contractAddress: USDT_CONTRACT },
      };
      const res = await postWebhook(h, payload, { secret: 'whsec_attacker_' + 'z'.repeat(32) }).expect(401);
      expect(res.body.message).toBe('Invalid webhook signature');
      await postWebhook(h, payload, { timestamp: Math.floor(Date.now() / 1000) - 3600 }).expect(401); // stale
      await h.http().post('/payments/webhook').set('content-type', 'application/json').send(JSON.stringify(payload)).expect(401); // unsigned
      expect(await snapshot()).toEqual(before);
      expect(await h.prisma.webhookEvent.findUnique({ where: { id: payload.id } })).toBeNull();
    });

    it('treats a replayed event as a duplicate and never double-credits', async () => {
      const payload = {
        id: eventId(), type: 'deposit.confirmed', createdAt: new Date().toISOString(),
        data: { network: 'ethereum', asset: 'USDT', txHash: evmHash(), outputIndex: 1, toAddress: await address(client, 'USDT'), amount: '100', confirmations: 12, blockNumber: 2, contractAddress: USDT_CONTRACT },
      };
      expect((await postWebhook(h, payload).expect(200)).body.outcome.status).toBe('credited');
      const after = await snapshot();
      expect((await postWebhook(h, payload).expect(200)).body.outcome.status).toBe('duplicate_event');
      const reannounced = { ...payload, id: eventId() };
      expect((await postWebhook(h, reannounced).expect(200)).body.outcome.status).toBe('already_credited');
      expect(await snapshot()).toEqual(after);
    });
  });

  it('reconciles: every balance equals the sum of its completed ledger entries', async () => {
    const rows = await h.prisma.$queryRaw<{ user_id: string; asset: string; balance: string; ledger: string }[]>`
      SELECT b.user_id, b.asset_type::text AS asset, b.balance::text AS balance,
             COALESCE(SUM(CASE WHEN t.type IN ('withdrawal', 'adjustment_debit') THEN -t.amount ELSE t.amount END), 0)::text AS ledger
      FROM "balances" b
      LEFT JOIN "transactions" t ON t.user_id = b.user_id AND t.asset_type = b.asset_type AND t.status = 'completed'
      WHERE b.user_id IN (${referrer.id}::uuid, ${client.id}::uuid, ${solo.id}::uuid)
      GROUP BY b.user_id, b.asset_type, b.balance`;
    expect(rows).toHaveLength(9);
    for (const r of rows) expect(D(r.balance).equals(r.ledger), `${r.asset} for ${r.user_id}`).toBe(true);
  });
});
