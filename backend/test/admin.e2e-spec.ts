import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { loginWithCode } from './support/login.js';
import type { App } from 'supertest/types.js';
import type { PrismaService as PrismaServiceType } from '../src/prisma/prisma.service.js';

// Requires Postgres + Redis cluster and applied migrations (see README).

const RUN = Date.now().toString(36);
const DOMAIN = `admin-${RUN}.test`;
const PASSWORD = 'Str0ngPassw0rd';
const SECRET = 'whsec_' + 'a'.repeat(40);
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

describe('Admin console API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaServiceType;
  let savedSettings: { key: string; value: string }[] = [];
  let sign: (secret: string, body: string) => string;
  const users: Record<string, { id: string; jwt: string; referralCode: string }> = {};
  const http = () => request(app.getHttpServer());
  const as = (name: string) => ({ Authorization: `Bearer ${users[name].jwt}` });

  async function makeUser(name: string, opts: { admin?: boolean; ref?: string } = {}) {
    const email = `${name}@${DOMAIN}`;
    await http().post('/api/auth/register').send({ email, password: PASSWORD, referralCode: opts.ref }).expect(201);
    await prisma.user.update({
      where: { email },
      data: { isVerified: true, verifiedAt: new Date(), verificationToken: null, role: opts.admin ? 'ADMIN' : 'CLIENT' },
    });
    const login = await loginWithCode(app, email, PASSWORD);
    users[name] = { id: login.body.user.id, jwt: login.body.accessToken, referralCode: login.body.user.referralCode };
  }

  const usdt = async (name: string) =>
    (await prisma.balance.findUniqueOrThrow({ where: { userId_assetType: { userId: users[name].id, assetType: 'USDT' } } })).balance.toString();

  beforeAll(async () => {
    Object.assign(process.env, {
      BCRYPT_ROUNDS: '4',
      MAIL_PROVIDER: 'log',
      YIELD_SCHEDULER_ENABLED: 'false',
      WEBHOOK_SIGNING_SECRETS: SECRET,
      USDT_CONTRACT_ADDRESS: USDT,
      REFERRAL_REWARD_RATE: '0.01',
      PRICE_PROVIDER: 'simulated',
      REDIS_NAT_MAP: process.env.REDIS_NAT_MAP ?? '',
    });
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/app.setup.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const { MAIL_TRANSPORT } = await import('../src/mail/mail.types.js');
    ({ signWebhookPayload: sign } = await import('../src/payments/webhook-signature.js'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAIL_TRANSPORT)
      .useValue({ name: 'noop', send: async () => ({ provider: 'noop' }) })
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    savedSettings = await prisma.platformSetting.findMany();
    await prisma.platformSetting.deleteMany({}); // start from env defaults

    await makeUser('alice', { admin: true });
    await makeUser('bob', { admin: true });
    await makeUser('carol', { admin: true });
    await makeUser('client');
    await makeUser('friend', { ref: users.client?.referralCode });
  });

  afterAll(async () => {
    if (prisma) {
      const ids = (await prisma.user.findMany({ where: { email: { endsWith: `@${DOMAIN}` } }, select: { id: true } })).map((u) => u.id);
      await prisma.platformSetting.deleteMany({});
      for (const s of savedSettings) await prisma.platformSetting.create({ data: { key: s.key, value: s.value } });
      await prisma.platformSettingChange.deleteMany({ where: { changedById: { in: ids } } });
      await prisma.adminAuditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.balanceAdjustment.deleteMany({ where: { userId: { in: ids } } });
      await prisma.transaction.deleteMany({ where: { userId: { in: ids }, sourceTransactionId: { not: null } } });
      await prisma.transaction.deleteMany({ where: { userId: { in: ids } } });
      await prisma.depositAddress.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids }, referredByUserId: { not: null } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await app?.close();
  });

  it('refuses every admin route to clients (403) and anonymous callers (401)', async () => {
    const routes: [string, string][] = [
      ['get', '/api/admin/metrics'],
      ['get', '/api/admin/users'],
      ['get', `/api/admin/users/${users.client.id}`],
      ['post', `/api/admin/users/${users.friend.id}/adjustments`],
      ['get', '/api/admin/adjustments'],
      ['put', '/api/admin/settings'],
      ['get', '/api/admin/audit'],
      ['get', '/api/admin/yields'],
    ];
    for (const [method, path] of routes) {
      await (http() as unknown as Record<string, (p: string) => request.Test>)[method](path).expect(401);
      await (http() as unknown as Record<string, (p: string) => request.Test>)[method](path).set(as('client')).expect(403);
    }
  });

  it('demoting an admin revokes access on their very next request', async () => {
    await http().get('/api/admin/metrics').set(as('carol')).expect(200);
    await prisma.user.update({ where: { id: users.carol.id }, data: { role: 'CLIENT' } });
    await http().get('/api/admin/metrics').set(as('carol')).expect(403);
    await prisma.user.update({ where: { id: users.carol.id }, data: { role: 'ADMIN' } });
  });

  it('reports platform metrics that match the database', async () => {
    const res = await http().get('/api/admin/metrics').set(as('alice')).expect(200);
    const verified = await prisma.user.count({ where: { isVerified: true } });
    expect(res.body.accounts.verified).toBe(verified);
    expect(res.body.accounts.series).toHaveLength(30);
    expect(res.body.netDeposits.series).toHaveLength(30);
    expect(Object.keys(res.body.tvl.byAsset).sort()).toEqual(['BTC', 'ETH', 'USDT']);
    expect(typeof res.body.tvl.usd).toBe('number');
  });

  it('searches users and returns a full record (and audits the view)', async () => {
    const list = await http().get(`/api/admin/users?q=client@${DOMAIN}`).set(as('alice')).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ email: `client@${DOMAIN}`, referralCount: 1 });
    expect(list.body.items[0].balances).toHaveLength(3);
    const byCode = await http().get(`/api/admin/users?q=${users.client.referralCode.toLowerCase()}`).set(as('alice')).expect(200);
    expect(byCode.body.items[0].id).toBe(users.client.id);
    await http().get('/api/admin/users?verified=maybe').set(as('alice')).expect(400);

    const detail = await http().get(`/api/admin/users/${users.client.id}`).set(as('alice')).expect(200);
    expect(detail.body).toMatchObject({ email: `client@${DOMAIN}`, isVerified: true, referralCount: 1 });
    expect(detail.body).not.toHaveProperty('passwordHash');
    expect(detail.body).not.toHaveProperty('verificationToken');
    const audit = await prisma.adminAuditLog.findFirst({ where: { actorId: users.alice.id, action: 'user.view', targetId: users.client.id } });
    expect(audit).not.toBeNull();
    await http().get('/api/admin/users/not-a-uuid').set(as('alice')).expect(400);
  });

  describe('balance adjustments (maker–checker)', () => {
    const body = { asset: 'USDT', direction: 'CREDIT', amount: '250.5', reason: 'Goodwill credit for delayed deposit, case #4411', reference: 'CASE-4411' };

    it('validates requests', async () => {
      const post = (b: object, who = 'alice', target = users.client.id) => http().post(`/api/admin/users/${target}/adjustments`).set(as(who)).send(b);
      expect((await post({ ...body, reason: 'too short' }).expect(400)).body.message.join()).toMatch(/at least 15/);
      expect((await post({ ...body, amount: '1.1234567' }).expect(400)).body.message).toMatch(/at most 6 decimal/);
      await post({ ...body, direction: 'SIDEWAYS' }).expect(400);
      expect((await post(body, 'alice', users.alice.id).expect(403)).body.message).toMatch(/own account/);
      expect((await post({ ...body, direction: 'DEBIT', amount: '999999' }).expect(400)).body.message).toMatch(/exceeds/);
    });

    it('applies only after a different admin approves, and the customer sees it', async () => {
      const before = await usdt('client');
      const req = await http().post(`/api/admin/users/${users.client.id}/adjustments`).set(as('alice')).send(body).expect(201);
      expect(req.body).toMatchObject({ status: 'PENDING_APPROVAL', requestedBy: { email: `alice@${DOMAIN}` } });
      expect(await usdt('client')).toBe(before); // nothing moves on request

      expect((await http().post(`/api/admin/adjustments/${req.body.id}/approve`).set(as('alice')).send({}).expect(403)).body.message).toMatch(/different admin/);

      const ok = await http().post(`/api/admin/adjustments/${req.body.id}/approve`).set(as('bob')).send({ note: 'Verified against case' }).expect(200);
      expect(ok.body).toMatchObject({ status: 'APPLIED', decidedBy: { email: `bob@${DOMAIN}` } });
      expect(await usdt('client')).toBe((Number(before) + 250.5).toString());
      await http().post(`/api/admin/adjustments/${req.body.id}/approve`).set(as('carol')).send({}).expect(409);

      const activity = await http().get('/api/wallets/transactions?type=ADJUSTMENT_CREDIT').set(as('client')).expect(200);
      expect(activity.body.items[0]).toMatchObject({ amount: '250.5', status: 'COMPLETED', note: body.reason });
    });

    it('lets exactly one of two simultaneous approvers apply a request', async () => {
      const before = await usdt('client');
      const req = await http().post(`/api/admin/users/${users.client.id}/adjustments`).set(as('alice')).send({ ...body, amount: '10' }).expect(201);
      const [x, y] = await Promise.all([
        http().post(`/api/admin/adjustments/${req.body.id}/approve`).set(as('bob')).send({}),
        http().post(`/api/admin/adjustments/${req.body.id}/approve`).set(as('carol')).send({}),
      ]);
      expect([x.status, y.status].sort((a, b) => a - b)).toEqual([200, 409]);
      expect(await usdt('client')).toBe((Number(before) + 10).toString());
    });

    it('rejects debits that would overdraw at approval time, and supports rejection', async () => {
      const bal = Number(await usdt('client'));
      const req = await http()
        .post(`/api/admin/users/${users.client.id}/adjustments`)
        .set(as('alice'))
        .send({ ...body, direction: 'DEBIT', amount: String(bal) })
        .expect(201);
      // Balance drops before approval (e.g. a withdrawal), so the debit would overdraw.
      await prisma.balance.update({ where: { userId_assetType: { userId: users.client.id, assetType: 'USDT' } }, data: { balance: bal - 1 } });
      expect((await http().post(`/api/admin/adjustments/${req.body.id}/approve`).set(as('bob')).send({}).expect(400)).body.message).toMatch(/exceeds/);
      const rej = await http().post(`/api/admin/adjustments/${req.body.id}/reject`).set(as('bob')).send({ note: 'Customer withdrew in the meantime' }).expect(200);
      expect(rej.body.status).toBe('REJECTED');
      expect(Number(await usdt('client'))).toBe(bal - 1);
    });

    it('the database itself forbids self-approval and self-adjustment', async () => {
      await expect(
        prisma.balanceAdjustment.create({
          data: { userId: users.bob.id, assetType: 'USDT', direction: 'CREDIT', amount: '1', reason: 'x'.repeat(20), requestedById: users.bob.id },
        }),
      ).rejects.toThrow();
      const adj = await prisma.balanceAdjustment.create({
        data: { userId: users.client.id, assetType: 'USDT', direction: 'CREDIT', amount: '1', reason: 'x'.repeat(20), requestedById: users.bob.id },
      });
      await expect(
        prisma.balanceAdjustment.update({ where: { id: adj.id }, data: { status: 'APPLIED', decidedById: users.bob.id } }),
      ).rejects.toThrow();
    });

    it('lists the approval queue by status', async () => {
      const res = await http().get('/api/admin/adjustments?status=applied').set(as('bob')).expect(200);
      expect(res.body.every((a: { status: string }) => a.status === 'APPLIED')).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('platform parameters', () => {
    it('shows defaults, validates and applies changes with history', async () => {
      const get = await http().get('/api/admin/settings').set(as('alice')).expect(200);
      expect(get.body.settings.find((s: { name: string }) => s.name === 'referralDepositRewardRate')).toMatchObject({ value: '0.01', source: 'default' });

      await http().put('/api/admin/settings').set(as('alice')).send({ referralDepositRewardRate: '0.25', note: 'too high' }).expect(400);
      await http().put('/api/admin/settings').set(as('alice')).send({ referralDepositRewardRate: '0.02' }).expect(400); // note required
      const put = await http()
        .put('/api/admin/settings')
        .set(as('alice'))
        .send({ referralDepositRewardRate: '0.02', affiliateYieldRewardRate: '0.05', note: 'Q4 referral campaign' })
        .expect(200);
      // affiliate rate unchanged (equals default) → only one change applied
      expect(put.body.applied).toEqual([{ name: 'referralDepositRewardRate', from: '0.01', to: '0.02' }]);
      expect(put.body.history[0]).toMatchObject({ key: 'referral.deposit_reward_rate', oldValue: null, newValue: '0.02', note: 'Q4 referral campaign' });
    });

    it('a changed referral rate applies to the very next deposit', async () => {
      const addr = (await http().get('/api/wallets/USDT/deposit-address').set(as('friend')).expect(200)).body.address;
      const before = Number(await usdt('client'));
      const payload = JSON.stringify({
        id: `evt_admin_${randomBytes(6).toString('hex')}`, type: 'deposit.confirmed', createdAt: new Date().toISOString(),
        data: { network: 'ethereum', asset: 'USDT', txHash: '0x' + randomBytes(32).toString('hex'), outputIndex: 0, toAddress: addr, amount: '1000', confirmations: 20, blockNumber: 1, contractAddress: USDT },
      });
      const res = await http().post('/payments/webhook').set('content-type', 'application/json').set('x-webhook-signature', sign(SECRET, payload)).send(payload).expect(200);
      expect(res.body.outcome.referralBonus.amountUsdt).toBe('20'); // 2% of 1,000
      expect(Number(await usdt('client'))).toBe(before + 20);
    });
  });

  it('keeps an append-only audit trail', async () => {
    const res = await http().get('/api/admin/audit?limit=100').set(as('alice')).expect(200);
    const actions = new Set(res.body.items.map((i: { action: string }) => i.action));
    for (const a of ['user.view', 'adjustment.request', 'adjustment.approve', 'adjustment.reject', 'settings.update']) expect(actions).toContain(a);
    const id = res.body.items[0].id;
    await expect(prisma.$executeRaw`UPDATE "admin_audit_log" SET action = 'tampered' WHERE id = ${id}::uuid`).rejects.toThrow(/append-only/);
  });
});
