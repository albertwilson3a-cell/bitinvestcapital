/**
 * Suite 1: Auth & verification.
 * Registration → bcrypt storage → verification token → /api/auth/verify → login.
 */
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { bootstrap, PASSWORD, uniqueEmail, type Harness } from './support/harness.js';

describe('Suite 1: Auth & verification', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await bootstrap();
  });
  afterAll(async () => h?.close());

  describe('registration', () => {
    it('creates an unverified user with three zero wallets and a referral code', async () => {
      const email = uniqueEmail('reg');
      const res = await h.http().post('/api/auth/register').send({ email, password: PASSWORD }).expect(201);

      expect(res.body.user).toMatchObject({ email, isVerified: false, role: 'CLIENT' });
      expect(res.body.user.referralCode).toMatch(/^[A-Z2-9]{8}$/);
      expect(Object.keys(res.body.user)).not.toEqual(expect.arrayContaining(['passwordHash', 'verificationToken']));

      const row = await h.prisma.user.findUniqueOrThrow({ where: { email }, include: { balances: true } });
      expect(row.isVerified).toBe(false);
      expect(row.balances.map((b) => [b.assetType, b.balance.toString()]).sort((a, b) => a[0].localeCompare(b[0]))).toEqual([
        ['BTC', '0'],
        ['ETH', '0'],
        ['USDT', '0'],
      ]);
    });

    it('normalises email case and rejects duplicates with 409', async () => {
      const email = uniqueEmail('dup');
      await h.http().post('/api/auth/register').send({ email: email.toUpperCase(), password: PASSWORD }).expect(201);
      expect(await h.prisma.user.count({ where: { email } })).toBe(1);
      await h.http().post('/api/auth/register').send({ email, password: PASSWORD }).expect(409);
    });

    it.each([
      ['an invalid email', { email: 'nope', password: PASSWORD }],
      ['a short password', { email: uniqueEmail('v'), password: 'Ab1!' }],
      ['a password without digits', { email: uniqueEmail('v'), password: 'NoDigitsHere!' }],
      ['an unknown field', { email: uniqueEmail('v'), password: PASSWORD, role: 'ADMIN' }],
    ])('rejects %s with 400 and creates nothing', async (_, body) => {
      const before = await h.prisma.user.count();
      await h.http().post('/api/auth/register').send(body).expect(400);
      expect(await h.prisma.user.count()).toBe(before);
    });
  });

  describe('bcrypt password hashing', () => {
    let hashA: string;
    let hashB: string;

    beforeAll(async () => {
      const [a, b] = [uniqueEmail('hash-a'), uniqueEmail('hash-b')];
      await h.http().post('/api/auth/register').send({ email: a, password: PASSWORD }).expect(201);
      await h.http().post('/api/auth/register').send({ email: b, password: PASSWORD }).expect(201);
      hashA = (await h.prisma.user.findUniqueOrThrow({ where: { email: a } })).passwordHash;
      hashB = (await h.prisma.user.findUniqueOrThrow({ where: { email: b } })).passwordHash;
    });

    it('stores a bcrypt hash at the configured cost, never the password', async () => {
      expect(hashA).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
      expect(bcrypt.getRounds(hashA)).toBe(Number(process.env.BCRYPT_ROUNDS));
      expect(hashA).not.toContain(PASSWORD);
    });

    it('salts per user: the same password yields different hashes', () => {
      expect(hashA).not.toBe(hashB);
    });

    it('verifies the right password and rejects others', async () => {
      expect(await bcrypt.compare(PASSWORD, hashA)).toBe(true);
      expect(await bcrypt.compare(`${PASSWORD}x`, hashA)).toBe(false);
      expect(await bcrypt.compare(PASSWORD.toLowerCase(), hashA)).toBe(false);
    });
  });

  describe('verification token', () => {
    const email = uniqueEmail('token');
    let token: string;

    beforeAll(async () => {
      await h.http().post('/api/auth/register').send({ email, password: PASSWORD }).expect(201);
      token = h.mail.tokenFor(email);
    });

    it('emails a 256-bit token and stores only its SHA-256 hash with an expiry', async () => {
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      const row = await h.prisma.user.findUniqueOrThrow({ where: { email } });
      expect(row.verificationToken).toBe(createHash('sha256').update(token).digest('hex'));
      expect(row.verificationToken).not.toBe(token);
      const ttlHours = (row.verificationTokenExpiresAt!.getTime() - Date.now()) / 3_600_000;
      expect(ttlHours).toBeGreaterThan(23.9);
      expect(ttlHours).toBeLessThanOrEqual(24);
    });

    it('sends the link to https://bitinvestcapital.com/verify', () => {
      const mail = h.mail.sent.find((m) => m.to.email === email)!;
      expect(mail.html).toContain(`https://bitinvestcapital.com/verify?token=${token}`);
      expect(mail.subject).toContain('BitInvest Capital');
    });

    it('blocks sign-in until verified (403)', async () => {
      await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(403);
    });

    it('GET /api/auth/verify switches the user to verified and destroys the token', async () => {
      const res = await h.http().get('/api/auth/verify').query({ token }).expect(200);
      expect(res.body.user).toMatchObject({ email, isVerified: true });

      const row = await h.prisma.user.findUniqueOrThrow({ where: { email } });
      expect(row.isVerified).toBe(true);
      expect(row.verifiedAt).toBeInstanceOf(Date);
      expect(row.verificationToken).toBeNull();
      expect(row.verificationTokenExpiresAt).toBeNull();
    });

    it('refuses to reuse the consumed token', async () => {
      await h.http().get('/api/auth/verify').query({ token }).expect(400);
    });

    it('then signs in with the emailed code and issues a JWT for bitinvestcapital.com', async () => {
      const start = await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
      expect(start.body).toMatchObject({ status: 'code_required', expiresInSeconds: 600 });
      expect(start.body.accessToken).toBeUndefined();
      const res = await h.http().post('/api/auth/login/verify').send({ challengeId: start.body.challengeId, code: h.mail.codeFor(email) }).expect(200);
      const claims = h.app.get(JwtService).decode<{ sub: string; iss: string; aud: string; exp: number }>(res.body.accessToken);
      const row = await h.prisma.user.findUniqueOrThrow({ where: { email } });
      expect(claims).toMatchObject({ sub: row.id, iss: 'https://bitinvestcapital.com', aud: 'https://bitinvestcapital.com' });
      await h.http().get('/api/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200);
      await h.http().post('/api/auth/login').send({ email, password: 'Wrong-Passw0rd!' }).expect(401);
    });

    it('rejects malformed, unknown and expired tokens', async () => {
      await h.http().get('/api/auth/verify').query({ token: 'not-a-token' }).expect(400);
      await h.http().get('/api/auth/verify').query({ token: 'f'.repeat(64) }).expect(400);

      const late = uniqueEmail('expired');
      await h.http().post('/api/auth/register').send({ email: late, password: PASSWORD }).expect(201);
      await h.prisma.user.update({ where: { email: late }, data: { verificationTokenExpiresAt: new Date(Date.now() - 1) } });
      const res = await h.http().get('/api/auth/verify').query({ token: h.mail.tokenFor(late) }).expect(400);
      expect(res.body.message).toMatch(/expired/);
      expect((await h.prisma.user.findUniqueOrThrow({ where: { email: late } })).isVerified).toBe(false);
    });
  });
});
