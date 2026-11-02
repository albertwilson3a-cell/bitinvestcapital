import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { loginWithCode } from './support/login.js';
import type { App } from 'supertest/types.js';
import type { PrismaService as PrismaServiceType } from '../src/prisma/prisma.service.js';
import type { MailTransport, OutgoingMail } from '../src/mail/mail.types.js';

// Requires Postgres + the Redis cluster (docker compose up -d) and applied migrations.

const RUN = Date.now().toString(36);
const DOMAIN = `e2e-${RUN}.test`;
const email = (name: string) => `${name}@${DOMAIN}`;
const PASSWORD = 'Str0ngPassw0rd';
const FRONTEND_URL = 'https://bitinvestcapital.com';

class CapturingTransport implements MailTransport {
  readonly name = 'capture';
  readonly sent: OutgoingMail[] = [];
  async send(mail: OutgoingMail) {
    this.sent.push(mail);
    return { provider: this.name, messageId: String(this.sent.length) };
  }
  lastTo(address: string): OutgoingMail | undefined {
    return [...this.sent].reverse().find((m) => m.to.email === address);
  }
  tokenFor(address: string): string {
    const mail = this.lastTo(address);
    const match = mail?.text.match(/verify\?token=([a-f0-9]{64})/);
    if (!match) throw new Error(`No verification email captured for ${address}`);
    return match[1];
  }
}

describe('Auth & email onboarding (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaServiceType;
  const mail = new CapturingTransport();

  beforeAll(async () => {
    // ConfigModule reads env when app.module is imported, so set overrides first.
    Object.assign(process.env, {
      BCRYPT_ROUNDS: '4',
      FRONTEND_URL,
      MAIL_PROVIDER: 'log',
      VERIFICATION_RESEND_COOLDOWN_SECONDS: '60',
      REDIS_NAT_MAP: process.env.REDIS_NAT_MAP ?? '',
    });
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/app.setup.js');
    const { MAIL_TRANSPORT } = await import('../src/mail/mail.types.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAIL_TRANSPORT)
      .useValue(mail)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma?.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` }, referredByUserId: { not: null } } });
    await prisma?.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  describe('request validation (class-validator)', () => {
    it.each([
      ['empty body', {}, ['email must be a valid email address', 'password must be at least 8 characters']],
      ['invalid email', { email: 'not-an-email', password: PASSWORD }, ['email must be a valid email address']],
      ['short password', { email: email('v1'), password: 'Ab1' }, ['password must be at least 8 characters']],
      ['no uppercase', { email: email('v2'), password: 'lowercase123' }, ['password must contain an uppercase letter']],
      ['no number', { email: email('v3'), password: 'NoNumbersHere' }, ['password must contain a number']],
      ['too long', { email: email('v4'), password: 'Aa1' + 'x'.repeat(80) }, ['password must be at most 72 characters']],
      ['bad referral code', { email: email('v5'), password: PASSWORD, referralCode: 'bad-code!' }, ['referralCode must be 6-16 letters or digits']],
      ['unknown field', { email: email('v6'), password: PASSWORD, role: 'admin' }, ['property role should not exist']],
    ])('rejects registration with %s', async (_, body, messages) => {
      const res = await http().post('/api/auth/register').send(body).expect(400);
      for (const m of messages) expect(res.body.message).toContain(m);
    });

    it('rejects a malformed verification token', async () => {
      const res = await http().get('/api/auth/verify').query({ token: 'abc' }).expect(400);
      expect(res.body.message).toContain('token is malformed');
      await http().get('/api/auth/verify').expect(400);
    });

    it('rejects login without a password', async () => {
      const res = await http().post('/api/auth/login').send({ email: email('x') }).expect(400);
      expect(res.body.message.join(' ')).toMatch(/password/);
    });

    it('rejects resend with an invalid email', async () => {
      await http().post('/api/auth/resend-verification').send({ email: 'nope' }).expect(400);
    });
  });

  describe('registration → verification → login', () => {
    const alice = email('alice');
    let aliceToken: string;
    let aliceReferralCode: string;

    it('registers, creating zero wallets, a referral code and a hashed expiring token', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ email: `  ${alice.toUpperCase()} `, password: PASSWORD })
        .expect(201);

      expect(res.body.user).toMatchObject({ email: alice, isVerified: false, role: 'CLIENT' });
      expect(res.body.user.referralCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user).not.toHaveProperty('verificationToken');
      aliceReferralCode = res.body.user.referralCode;

      const row = await prisma.user.findUniqueOrThrow({ where: { email: alice }, include: { balances: true } });
      expect(row.passwordHash).toMatch(/^\$2[aby]\$04\$/);
      expect(row.passwordHash).not.toContain(PASSWORD);
      expect(row.balances.map((b) => b.assetType).sort()).toEqual(['BTC', 'ETH', 'USDT']);
      for (const b of row.balances) {
        expect(b.balance.toFixed(2)).toBe('0.00');
        expect(b.lockedBalance.toFixed(2)).toBe('0.00');
        expect(b.flexibleYieldEarned.toFixed(2)).toBe('0.00');
      }

      aliceToken = mail.tokenFor(alice);
      expect(row.verificationToken).toMatch(/^[a-f0-9]{64}$/);
      expect(row.verificationToken).not.toBe(aliceToken);
      const ttlMs = row.verificationTokenExpiresAt!.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(23.9 * 3600_000);
      expect(ttlMs).toBeLessThanOrEqual(24 * 3600_000);
    });

    it('sends an HTML onboarding email with the FRONTEND_URL/verify?token= link', () => {
      const sent = mail.lastTo(alice)!;
      expect(sent.subject).toMatch(/Confirm your email/);
      expect(sent.html).toContain(`href="${FRONTEND_URL}/verify?token=${aliceToken}"`);
      expect(sent.html).toMatch(/<!DOCTYPE html>/);
      expect(sent.text).toContain(`${FRONTEND_URL}/verify?token=${aliceToken}`);
    });

    it('rejects a duplicate email regardless of case', async () => {
      await http().post('/api/auth/register').send({ email: alice.toUpperCase(), password: PASSWORD }).expect(409);
    });

    it('blocks login until the email is verified', async () => {
      const res = await http().post('/api/auth/login').send({ email: alice, password: PASSWORD }).expect(403);
      expect(res.body.message).toMatch(/not verified/);
    });

    it('rejects wrong passwords and unknown accounts with the same 401', async () => {
      const a = await http().post('/api/auth/login').send({ email: alice, password: 'Wrong-pass1' }).expect(401);
      const b = await http().post('/api/auth/login').send({ email: email('ghost'), password: PASSWORD }).expect(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('rejects a well-formed but unknown token', async () => {
      await http().get('/api/auth/verify').query({ token: 'a'.repeat(64) }).expect(400);
    });

    it('verifies the email, flags the profile and destroys the token', async () => {
      const res = await http().get('/api/auth/verify').query({ token: aliceToken }).expect(200);
      expect(res.body.user).toMatchObject({ email: alice, isVerified: true });

      const row = await prisma.user.findUniqueOrThrow({ where: { email: alice } });
      expect(row.isVerified).toBe(true);
      expect(row.verifiedAt).toBeInstanceOf(Date);
      expect(row.verificationToken).toBeNull();
      expect(row.verificationTokenExpiresAt).toBeNull();
    });

    it('refuses to reuse a consumed token', async () => {
      const res = await http().post('/api/auth/verify').send({ token: aliceToken }).expect(400);
      expect(res.body.message).toMatch(/invalid or has already been used/);
    });

    it('logs in after verification and accesses a protected route with the JWT', async () => {
      const login = await loginWithCode(app, alice, PASSWORD);
      expect(login.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 3600 });
      expect(login.body.accessToken.split('.')).toHaveLength(3);

      const me = await http().get('/api/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
      expect(me.body).toMatchObject({ email: alice, isVerified: true, referralCode: aliceReferralCode });
      expect(me.body.balances).toHaveLength(3);
      expect(me.body.lastLoginAt).not.toBeNull();
    });

    it('rejects protected routes without or with a tampered token', async () => {
      await http().get('/api/auth/me').expect(401);
      const login = await loginWithCode(app, alice, PASSWORD);
      const [h, p, s] = login.body.accessToken.split('.');
      const tampered = `${h}.${p}.${s.slice(0, -2)}${s.endsWith('AA') ? 'BB' : 'AA'}`;
      await http().get('/api/auth/me').set('Authorization', `Bearer ${tampered}`).expect(401);
    });

    it('records referrals and promotes them when the referee verifies', async () => {
      const bob = email('bob');
      await http()
        .post('/api/auth/register')
        .send({ email: bob, password: PASSWORD, referralCode: aliceReferralCode.toLowerCase() })
        .expect(201);

      const bobRow = await prisma.user.findUniqueOrThrow({ where: { email: bob }, include: { referralReceived: true } });
      const aliceRow = await prisma.user.findUniqueOrThrow({ where: { email: alice } });
      expect(bobRow.referredByUserId).toBe(aliceRow.id);
      expect(bobRow.referralReceived).toMatchObject({ referrerId: aliceRow.id, registrationStatus: 'PENDING' });

      await http().get('/api/auth/verify').query({ token: mail.tokenFor(bob) }).expect(200);
      const referral = await prisma.referral.findUniqueOrThrow({ where: { refereeId: bobRow.id } });
      expect(referral.registrationStatus).toBe('VERIFIED');
    });

    it('rejects an unknown referral code', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ email: email('carol'), password: PASSWORD, referralCode: 'ZZZZ9999' })
        .expect(400);
      expect(res.body.message).toMatch(/referralCode/);
    });
  });

  describe('domain policy: CORS and token claims', () => {
    const preflight = (origin: string) =>
      http().options('/api/auth/me').set('Origin', origin).set('Access-Control-Request-Method', 'GET').set('Access-Control-Request-Headers', 'authorization');

    it.each(['https://bitinvestcapital.com', 'https://app.bitinvestcapital.com', 'https://admin.bitinvestcapital.com'])(
      'grants CORS to %s',
      async (origin) => {
        const res = await preflight(origin);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
        expect(res.headers['access-control-allow-credentials']).toBeUndefined();
      },
    );

    it.each(['https://evil.example', 'https://evilbitinvestcapital.com', 'https://bitinvestcapital.com.evil.io', 'http://bitinvestcapital.com'])(
      'refuses CORS to %s',
      async (origin) => {
        const res = await preflight(origin);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      },
    );

    it('issues tokens for bitinvestcapital.com and rejects tokens with another issuer or audience', async () => {
      const { JwtService } = await import('@nestjs/jwt');
      const jwt = app.get(JwtService);
      const email = `claims-${RUN}@${DOMAIN}`;
      await http().post('/api/auth/register').send({ email, password: PASSWORD }).expect(201);
      await prisma.user.update({ where: { email }, data: { isVerified: true, verificationToken: null } });
      const login = await loginWithCode(app, email, PASSWORD);
      const claims = jwt.decode<{ iss: string; aud: string; sub: string }>(login.body.accessToken);
      expect(claims).toMatchObject({ iss: 'https://bitinvestcapital.com', aud: 'https://bitinvestcapital.com' });

      const base = { sub: claims.sub, email, role: 'CLIENT' };
      const forged = [
        jwt.sign(base, { issuer: 'https://attacker.example', audience: 'https://bitinvestcapital.com' }),
        jwt.sign(base, { issuer: 'https://bitinvestcapital.com', audience: 'https://other-app.example' }),
      ];
      for (const token of forged) {
        await http().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
      }
      await http().get('/api/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
    });
  });

  describe('token expiry and resend', () => {
    const dave = email('dave');

    it('rejects an expired token, then issues a fresh one on resend (with cooldown)', async () => {
      await http().post('/api/auth/register').send({ email: dave, password: PASSWORD }).expect(201);
      const firstToken = mail.tokenFor(dave);
      await prisma.user.update({
        where: { email: dave },
        data: { verificationTokenExpiresAt: new Date(Date.now() - 1000) },
      });

      const expired = await http().get('/api/auth/verify').query({ token: firstToken }).expect(400);
      expect(expired.body.message).toMatch(/expired/);

      const before = mail.sent.length;
      const resend = await http().post('/api/auth/resend-verification').send({ email: dave }).expect(202);
      expect(resend.body.message).toMatch(/If an unverified account exists/);
      expect(mail.sent.length).toBe(before + 1);
      const secondToken = mail.tokenFor(dave);
      expect(secondToken).not.toBe(firstToken);

      // Within the cooldown: same generic response, nothing sent.
      await http().post('/api/auth/resend-verification').send({ email: dave }).expect(202);
      expect(mail.sent.length).toBe(before + 1);

      await http().get('/api/auth/verify').query({ token: firstToken }).expect(400);
      await http().get('/api/auth/verify').query({ token: secondToken }).expect(200);
      await loginWithCode(app, dave, PASSWORD);
    });

    it('gives the same response for unknown emails (no account enumeration)', async () => {
      const before = mail.sent.length;
      const res = await http().post('/api/auth/resend-verification').send({ email: email('nobody') }).expect(202);
      expect(res.body.message).toMatch(/If an unverified account exists/);
      expect(mail.sent.length).toBe(before);
    });
  });
});
