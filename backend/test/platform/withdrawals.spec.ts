/**
 * Withdrawals: email-confirmed request → funds locked → admin review →
 * admin release with tx hash, or rejection/cancellation returning funds.
 */
import { UserRole } from '../../src/generated/prisma/client.js';
import { bootstrap, registerVerified, type Harness } from './support/harness.js';

const ETH_OK = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'; // EIP-55 test vector
const ETH_BAD_CHECKSUM = '0x5aaeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
const BTC_OK = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const ETH_TX = `0x${'ab'.repeat(32)}`;

describe('Withdrawals', () => {
  let h: Harness;
  let client: Awaited<ReturnType<typeof registerVerified>>;
  let admin: Awaited<ReturnType<typeof registerVerified>>;

  const balance = async (asset: 'USDT' | 'BTC' | 'ETH') => {
    const b = await h.prisma.balance.findUniqueOrThrow({ where: { userId_assetType: { userId: client.id, assetType: asset } } });
    return { available: b.balance.toFixed(), locked: b.lockedBalance.toFixed() };
  };

  /** Request + confirm with the emailed code; returns the created withdrawal. */
  async function withdraw(asset: string, amount: string, address: string) {
    const start = await h.http().post('/api/withdrawals').set(client.auth).send({ asset, amount, address }).expect(200);
    const code = h.mail.codeFor(client.email, 'withdrawal-code');
    const res = await h.http().post('/api/withdrawals/confirm').set(client.auth).send({ challengeId: start.body.challengeId, code }).expect(201);
    return res.body as { id: string; status: string };
  }

  beforeAll(async () => {
    h = await bootstrap();
    client = await registerVerified(h, 'wd-client');
    admin = await registerVerified(h, 'wd-admin');
    await h.prisma.user.update({ where: { id: admin.id }, data: { role: UserRole.ADMIN } });
    await h.prisma.balance.update({ where: { userId_assetType: { userId: client.id, assetType: 'USDT' } }, data: { balance: '1000' } });
    await h.prisma.balance.update({ where: { userId_assetType: { userId: client.id, assetType: 'BTC' } }, data: { balance: '0.5' } });
    await h.http().put('/api/admin/withdrawals/settings/USDT').set(admin.auth).send({ fee: '5', minAmount: '20', enabled: true }).expect(200);
  });
  afterAll(async () => h?.close());

  it('shows fees, minimums and the available balance', async () => {
    const res = await h.http().get('/api/withdrawals/options').set(client.auth).expect(200);
    expect(res.body.find((o: { asset: string }) => o.asset === 'USDT')).toMatchObject({ fee: '5', minAmount: '20', enabled: true, available: '1000', network: 'ETHEREUM' });
  });

  it('validates address, amount, minimum, fee and balance before sending any code', async () => {
    const bad = async (body: object, msg: RegExp) => {
      const r = await h.http().post('/api/withdrawals').set(client.auth).send(body).expect(400);
      expect(JSON.stringify(r.body.message)).toMatch(msg);
    };
    await bad({ asset: 'USDT', amount: '100', address: ETH_BAD_CHECKSUM }, /valid Ethereum address/);
    await bad({ asset: 'USDT', amount: '100', address: BTC_OK }, /valid Ethereum address/);
    await bad({ asset: 'BTC', amount: '0.1', address: ETH_OK }, /valid Bitcoin address/);
    await bad({ asset: 'USDT', amount: '10', address: ETH_OK }, /minimum/);
    await bad({ asset: 'USDT', amount: '5000', address: ETH_OK }, /Insufficient/);
    await bad({ asset: 'USDT', amount: '25.1234567', address: ETH_OK }, /6 decimal places/);
    const own = await h.prisma.depositAddress.create({ data: { userId: admin.id, assetType: 'USDT', network: 'ETHEREUM', address: '0x000000000000000000000000000000000000dEaD', derivationIndex: 999_999, derivationPath: "m/44'/60'/0'/0/999999" } });
    await bad({ asset: 'USDT', amount: '100', address: own.address }, /deposit address/);
  });

  it('locks funds only after the emailed code is confirmed', async () => {
    const start = await h.http().post('/api/withdrawals').set(client.auth).send({ asset: 'USDT', amount: '100', address: ETH_OK.toLowerCase() }).expect(200);
    expect(start.body).toMatchObject({ status: 'code_required', amount: '100', fee: '5', netAmount: '95', address: ETH_OK });
    expect(await balance('USDT')).toEqual({ available: '1000', locked: '0' });
    await h.http().post('/api/withdrawals/confirm').set(client.auth).send({ challengeId: start.body.challengeId, code: '000000' }).expect(400);

    const code = h.mail.codeFor(client.email, 'withdrawal-code');
    const done = await h.http().post('/api/withdrawals/confirm').set(client.auth).send({ challengeId: start.body.challengeId, code }).expect(201);
    expect(done.body.status).toBe('PENDING_REVIEW');
    expect(await balance('USDT')).toEqual({ available: '900', locked: '100' });
    const tx = await h.prisma.transaction.findFirstOrThrow({ where: { userId: client.id, type: 'WITHDRAWAL' } });
    expect(tx).toMatchObject({ status: 'PENDING', address: ETH_OK });
  });

  it('admin approves, then marks sent with the on-chain hash: locked funds are debited and the client is emailed', async () => {
    const [w] = await h.http().get('/api/admin/withdrawals').set(admin.auth).expect(200).then((r) => r.body as { id: string }[]);
    const detail = await h.http().get(`/api/admin/withdrawals/${w.id}`).set(admin.auth).expect(200);
    expect(detail.body.client.email).toBe(client.email);
    expect(detail.body.signals.map((s: { text: string }) => s.text).join(' ')).toMatch(/Account opened|First withdrawal/);

    await h.http().post(`/api/admin/withdrawals/${w.id}/complete`).set(admin.auth).send({ txHash: ETH_TX }).expect(409); // must approve first
    await h.http().post(`/api/admin/withdrawals/${w.id}/approve`).set(admin.auth).send({ note: 'Checked' }).expect(200);
    await h.http().post(`/api/admin/withdrawals/${w.id}/complete`).set(admin.auth).send({ txHash: 'not-a-hash' }).expect(400);
    await h.http().post(`/api/admin/withdrawals/${w.id}/complete`).set(admin.auth).send({ txHash: ETH_TX }).expect(200);

    expect(await balance('USDT')).toEqual({ available: '900', locked: '0' });
    const row = await h.prisma.withdrawalRequest.findUniqueOrThrow({ where: { id: w.id }, include: { transaction: true } });
    expect(row).toMatchObject({ status: 'COMPLETED', txHash: ETH_TX, completedById: admin.id, reviewedById: admin.id });
    expect(row.transaction).toMatchObject({ status: 'COMPLETED', blockchainTxHash: ETH_TX });
    expect(h.mail.sent.some((m) => m.to.email === client.email && m.tags?.includes('withdrawal-sent') && m.text.includes(ETH_TX))).toBe(true);
    expect(await h.prisma.adminAuditLog.count({ where: { targetId: w.id } })).toBe(2);
    await h.http().post(`/api/admin/withdrawals/${w.id}/reject`).set(admin.auth).send({ reason: 'Too late now' }).expect(409);
  });

  it('rejection returns the full amount to the balance and tells the client why', async () => {
    const w = await withdraw('BTC', '0.2', BTC_OK);
    expect(await balance('BTC')).toEqual({ available: '0.3', locked: '0.2' });
    await h.http().post(`/api/admin/withdrawals/${w.id}/reject`).set(admin.auth).send({ reason: 'Address failed screening' }).expect(200);
    expect(await balance('BTC')).toEqual({ available: '0.5', locked: '0' });
    expect(h.mail.sent.some((m) => m.to.email === client.email && m.tags?.includes('withdrawal-rejected') && m.text.includes('Address failed screening'))).toBe(true);
  });

  it('clients can cancel while it awaits review, but not after approval', async () => {
    const a = await withdraw('USDT', '50', ETH_OK);
    await h.http().post(`/api/withdrawals/${a.id}/cancel`).set(client.auth).expect(200);
    expect(await balance('USDT')).toEqual({ available: '900', locked: '0' });

    const b = await withdraw('USDT', '50', ETH_OK);
    await h.http().post(`/api/admin/withdrawals/${b.id}/approve`).set(admin.auth).send({}).expect(200);
    await h.http().post(`/api/withdrawals/${b.id}/cancel`).set(client.auth).expect(409);
    await h.http().post(`/api/admin/withdrawals/${b.id}/reject`).set(admin.auth).send({ reason: 'Clean up test' }).expect(200);
  });

  it('never lets two confirmations spend the same balance', async () => {
    await h.prisma.balance.update({ where: { userId_assetType: { userId: client.id, assetType: 'USDT' } }, data: { balance: '100' } });
    const s1 = await h.http().post('/api/withdrawals').set(client.auth).send({ asset: 'USDT', amount: '80', address: ETH_OK }).expect(200);
    const c1 = h.mail.codeFor(client.email, 'withdrawal-code');
    const s2 = await h.http().post('/api/withdrawals').set(client.auth).send({ asset: 'USDT', amount: '80', address: ETH_OK }).expect(200);
    const c2 = h.mail.codeFor(client.email, 'withdrawal-code');
    const results = await Promise.all([
      h.http().post('/api/withdrawals/confirm').set(client.auth).send({ challengeId: s1.body.challengeId, code: c1 }),
      h.http().post('/api/withdrawals/confirm').set(client.auth).send({ challengeId: s2.body.challengeId, code: c2 }),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 400]);
    expect(await balance('USDT')).toEqual({ available: '20', locked: '80' });
  });

  it('respects disabled assets, suspension and admin-only access', async () => {
    await h.http().get('/api/admin/withdrawals').set(client.auth).expect(403);
    await h.http().put('/api/admin/withdrawals/settings/BTC').set(admin.auth).send({ fee: '0', minAmount: '0', enabled: false }).expect(200);
    await h.http().post('/api/withdrawals').set(client.auth).send({ asset: 'BTC', amount: '0.1', address: BTC_OK }).expect(400);
    await h.http().put('/api/admin/withdrawals/settings/BTC').set(admin.auth).send({ fee: '0.0001', minAmount: '0', enabled: true }).expect(200);
    await h.http().put('/api/admin/withdrawals/settings/BTC').set(admin.auth).send({ fee: '0.000000001', minAmount: '0', enabled: true }).expect(400);

    await h.http().get('/api/withdrawals').set(client.auth).expect(200).then((r) => expect(r.body.length).toBeGreaterThanOrEqual(4));
    const counts = await h.http().get('/api/admin/withdrawals/counts').set(admin.auth).expect(200);
    expect(counts.body.pendingReview).toBeGreaterThanOrEqual(1);
  });
});
