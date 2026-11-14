/**
 * Shared deposit addresses: every client sees the platform's address, reports the
 * transaction hash, and staff verify it before the balance is credited.
 * Real Nest app, real PostgreSQL relations; only email and prices are replaced.
 */
const ADDR = vi.hoisted(() => {
  const a = {
    BTC: 'bc1q84ma6k9jpmtj7m94fxy5jhufcp0hr68fqx9xvf',
    ETH: '0x86EF1E2Fb0454218d3eADe4aBCfD359F24B8068e',
  };
  // Must be set before AppModule (and its ConfigModule) is imported.
  process.env.DEPOSIT_ADDRESS_BTC = a.BTC;
  process.env.DEPOSIT_ADDRESS_ETH = a.ETH;
  process.env.DEPOSIT_ADDRESS_USDT = a.ETH.toLowerCase(); // stored in checksum form regardless
  return a;
});

import { UserRole } from '../../src/generated/prisma/client.js';
import { ChainLookupService } from '../../src/deposits/chain-lookup.service.js';
import { bootstrap, btcHash, evmHash, registerVerified, USDT_CONTRACT, type Harness } from './support/harness.js';

type Client = Awaited<ReturnType<typeof registerVerified>>;

describe('Shared deposit addresses with reviewed deposit reports', () => {
  let h: Harness;
  let alice: Client;
  let bob: Client;
  let admin: Client;

  const balance = async (userId: string, asset: 'USDT' | 'BTC' | 'ETH') =>
    (await h.prisma.balance.findUnique({ where: { userId_assetType: { userId, assetType: asset } } }))?.balance.toFixed() ?? '0';
  const report = (who: Client, body: object) => h.http().post('/api/deposits/claims').set(who.auth).send(body);
  const tagsFor = (email: string) => h.mail.sent.filter((m) => m.to.email === email).flatMap((m) => m.tags ?? []);

  beforeAll(async () => {
    h = await bootstrap();
    alice = await registerVerified(h, 'dc-alice');
    bob = await registerVerified(h, 'dc-bob', alice.referralCode);
    admin = await registerVerified(h, 'dc-admin');
    await h.prisma.user.update({ where: { id: admin.id }, data: { role: UserRole.ADMIN } });
  });
  afterAll(async () => h?.close());

  it('shows every client the same platform address and derives no personal addresses', async () => {
    const [a, b] = await Promise.all([alice, bob].map((c) => h.http().get('/api/wallets').set(c.auth).expect(200)));
    for (const res of [a, b]) {
      const by = Object.fromEntries(res.body.map((w: { asset: string }) => [w.asset, w]));
      expect(by.BTC).toMatchObject({ depositAddress: ADDR.BTC, depositMode: 'shared' });
      expect(by.ETH).toMatchObject({ depositAddress: ADDR.ETH, depositMode: 'shared' });
      expect(by.USDT).toMatchObject({ depositAddress: ADDR.ETH, depositMode: 'shared' });
    }
    const one = await h.http().get('/api/wallets/USDT/deposit-address').set(alice.auth).expect(200);
    expect(one.body).toMatchObject({ address: ADDR.ETH, depositMode: 'shared', tokenStandard: 'ERC-20' });
    expect(await h.prisma.depositAddress.count({ where: { userId: { in: [alice.id, bob.id] } } })).toBe(0);
  });

  it('validates the transaction hash, amount and sending address', async () => {
    const bad = async (body: object, msg: RegExp) => {
      const r = await report(alice, body).expect(400);
      expect(JSON.stringify(r.body.message)).toMatch(msg);
    };
    await bad({ asset: 'BTC', amount: '0.1', txHash: evmHash() }, /Bitcoin transaction ID/);
    await bad({ asset: 'USDT', amount: '10', txHash: `0x${'zz'.repeat(32)}` }, /transaction hash/);
    await bad({ asset: 'USDT', amount: '10.1234567', txHash: evmHash() }, /6 decimal places/);
    await bad({ asset: 'ETH', amount: '0', txHash: evmHash() }, /greater than zero/);
    await bad({ asset: 'ETH', amount: '1', txHash: evmHash(), fromAddress: 'not-an-address' }, /valid Ethereum address/);
    await bad({ asset: 'ETH', amount: '1', txHash: evmHash(), fromAddress: ADDR.ETH.toLowerCase() }, /your own wallet/);
    expect(await h.prisma.depositClaim.count()).toBe(0);
  });

  it('records a report, emails the client, and lets one transaction back only one open report', async () => {
    const hash = evmHash();
    const res = await report(alice, { asset: 'USDT', amount: '250', txHash: hash.slice(2).toUpperCase(), fromAddress: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed' }).expect(201);
    expect(res.body).toMatchObject({ status: 'PENDING_REVIEW', txHash: hash, address: ADDR.ETH, network: 'ETHEREUM' });
    expect(tagsFor(alice.email)).toContain('deposit-received');
    expect(await balance(alice.id, 'USDT')).toBe('0');

    // Same hash by another client (or again by Alice): refused.
    await report(bob, { asset: 'USDT', amount: '250', txHash: hash }).expect(409);
    await report(alice, { asset: 'USDT', amount: '250', txHash: hash }).expect(409);

    // A cancelled report frees the hash.
    await h.http().post(`/api/deposits/claims/${res.body.id}/cancel`).set(alice.auth).expect(200);
    const again = await report(bob, { asset: 'USDT', amount: '250', txHash: hash }).expect(201);
    await h.http().post(`/api/deposits/claims/${again.body.id}/cancel`).set(alice.auth).expect(404);

    const list = await h.http().get('/api/deposits/claims').set(alice.auth).expect(200);
    expect(list.body.map((c: { status: string }) => c.status)).toEqual(['CANCELLED']);
  });

  it('keeps the review queue admin-only', async () => {
    await h.http().get('/api/admin/deposits').set(alice.auth).expect(403);
    const [claim] = await h.prisma.depositClaim.findMany({ where: { status: 'PENDING_REVIEW' } });
    await h.http().post(`/api/admin/deposits/${claim.id}/approve`).set(alice.auth).send({ amount: '1' }).expect(403);
  });

  it('credits the amount the admin confirmed, pays the referral reward, audits and emails', async () => {
    const pending = await h.http().get('/api/admin/deposits').set(admin.auth).expect(200);
    const claim = pending.body.find((c: { user: { email: string } }) => c.user.email === bob.email);
    expect(claim).toMatchObject({ assetType: 'USDT', reportedAmount: '250', status: 'PENDING_REVIEW' });
    expect((await h.http().get('/api/admin/deposits/counts').set(admin.auth).expect(200)).body.pendingReview).toBe(1);

    const detail = await h.http().get(`/api/admin/deposits/${claim.id}`).set(admin.auth).expect(200);
    expect(detail.body.explorerUrl).toBe(`https://etherscan.io/tx/${claim.txHash}`);
    expect(detail.body.signals.map((s: { text: string }) => s.text).join(' | ')).toMatch(/also reported by .*dc-alice/);

    // On-chain only 249.5 arrived: the admin credits that.
    const ok = await h.http().post(`/api/admin/deposits/${claim.id}/approve`).set(admin.auth).send({ amount: '249.5', note: 'checked on etherscan' }).expect(200);
    expect(ok.body).toMatchObject({ status: 'CREDITED', creditedAmount: '249.5', reviewNote: 'checked on etherscan' });
    expect(await balance(bob.id, 'USDT')).toBe('249.5');

    const tx = await h.prisma.transaction.findUniqueOrThrow({ where: { id: ok.body.transactionId } });
    expect(tx).toMatchObject({ type: 'DEPOSIT', status: 'COMPLETED', blockchainTxHash: claim.txHash, network: 'ETHEREUM', address: ADDR.ETH, userId: bob.id });
    expect(tx.amount.toFixed()).toBe('249.5');

    // Bob was referred by Alice: 1% of the USD value, in USDT.
    const bonus = await h.prisma.transaction.findUniqueOrThrow({ where: { sourceTransactionId: tx.id } });
    expect(bonus).toMatchObject({ userId: alice.id, type: 'REFERRAL_BONUS' });
    expect(bonus.amount.toFixed()).toBe('2.495');

    const audit = await h.prisma.adminAuditLog.findFirstOrThrow({ where: { action: 'deposit_claim.credit', targetId: claim.id } });
    expect(audit.actorId).toBe(admin.id);
    expect(tagsFor(bob.email)).toContain('deposit-credited');

    // Second approval and re-reporting the credited hash both fail; nothing is credited twice.
    await h.http().post(`/api/admin/deposits/${claim.id}/approve`).set(admin.auth).send({ amount: '249.5' }).expect(409);
    await report(alice, { asset: 'USDT', amount: '249.5', txHash: claim.txHash }).expect(409);
    expect(await balance(bob.id, 'USDT')).toBe('249.5');
  });

  it('credits a contested report exactly once when two admins approve at the same moment', async () => {
    const r = await report(alice, { asset: 'BTC', amount: '0.01', txHash: btcHash() }).expect(201);
    const results = await Promise.all(
      [1, 2].map(() => h.http().post(`/api/admin/deposits/${r.body.id}/approve`).set(admin.auth).send({ amount: '0.01' })),
    );
    expect(results.map((x) => x.status).sort((a, b) => a - b)).toEqual([200, 409]);
    expect(await balance(alice.id, 'BTC')).toBe('0.01');
    expect(await h.prisma.transaction.count({ where: { blockchainTxHash: r.body.txHash } })).toBe(1);
  });

  it('rejects with a reason, emails the client and changes no balance', async () => {
    const r = await report(alice, { asset: 'ETH', amount: '1.5', txHash: evmHash() }).expect(201);
    await h.http().post(`/api/admin/deposits/${r.body.id}/reject`).set(admin.auth).send({ reason: 'no' }).expect(400);
    const rej = await h.http().post(`/api/admin/deposits/${r.body.id}/reject`).set(admin.auth).send({ reason: 'Transaction pays a different address' }).expect(200);
    expect(rej.body).toMatchObject({ status: 'REJECTED', reviewNote: 'Transaction pays a different address' });
    expect(await balance(alice.id, 'ETH')).toBe('0');
    expect(tagsFor(alice.email)).toContain('deposit-rejected');
    await h.http().post(`/api/admin/deposits/${r.body.id}/approve`).set(admin.auth).send({ amount: '1.5' }).expect(409);
  });

  it('refuses withdrawals to the shared platform address', async () => {
    const r = await h.http().post('/api/withdrawals').set(bob.auth).send({ asset: 'USDT', amount: '100', address: ADDR.ETH }).expect(400);
    expect(JSON.stringify(r.body.message)).toMatch(/deposit address/);
  });

  it('checks a reported transaction on-chain for the reviewer (BTC and USDT)', async () => {
    const lookup = h.app.get(ChainLookupService);
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

    const btc = await report(bob, { asset: 'BTC', amount: '0.02', txHash: btcHash(), fromAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }).expect(201);
    lookup.fetcher = async (url) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (u.endsWith('/blocks/tip/height')) return new Response('1005');
      return json({
        vin: [{ prevout: { scriptpubkey_address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' } }],
        vout: [{ scriptpubkey_address: ADDR.BTC, value: 1_500_000 }, { scriptpubkey_address: 'bc1qother', value: 99 }, { scriptpubkey_address: ADDR.BTC, value: 500_000 }],
        status: { confirmed: true, block_height: 1000 },
      });
    };
    const c1 = await h.http().get(`/api/admin/deposits/${btc.body.id}/chain`).set(admin.auth).expect(200);
    expect(c1.body).toMatchObject({ status: 'found', paysAddress: true, amountToAddress: '0.02', confirmations: 6, confirmed: true, fromMatches: true });

    const usdt = await report(bob, { asset: 'USDT', amount: '40', txHash: evmHash() }).expect(201);
    const pad = (a: string) => '0x' + a.slice(2).toLowerCase().padStart(64, '0');
    lookup.fetcher = async (_url, init) => {
      const { method } = JSON.parse(init?.body as string) as { method: string };
      const result = {
        eth_getTransactionByHash: { from: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed', to: USDT_CONTRACT, value: '0x0', blockNumber: '0x10' },
        eth_getTransactionReceipt: {
          status: '0x1',
          logs: [{ address: USDT_CONTRACT, topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', pad('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'), pad(ADDR.ETH)], data: '0x' + (40_000_000).toString(16) }],
        },
        eth_blockNumber: '0x1b',
      }[method];
      return json({ jsonrpc: '2.0', id: 1, result });
    };
    const c2 = await h.http().get(`/api/admin/deposits/${usdt.body.id}/chain`).set(admin.auth).expect(200);
    expect(c2.body).toMatchObject({ status: 'found', paysAddress: true, amountToAddress: '40', confirmations: 12, from: ['0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'], fromMatches: null });

    lookup.fetcher = async () => { throw new Error('offline'); };
    const c3 = await h.http().get(`/api/admin/deposits/${usdt.body.id}/chain`).set(admin.auth).expect(200);
    expect(c3.body).toMatchObject({ status: 'unavailable', paysAddress: false });
  });
});
