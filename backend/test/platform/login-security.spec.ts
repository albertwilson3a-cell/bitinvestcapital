/**
 * Sign-in codes, password reset, session invalidation and account suspension.
 */
import { UserRole } from '../../src/generated/prisma/client.js';
import { bootstrap, PASSWORD, registerVerified, type Harness } from './support/harness.js';

describe('Login security', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await bootstrap();
  });
  afterAll(async () => h?.close());

  describe('emailed sign-in code', () => {
    let email: string;
    beforeAll(async () => {
      email = (await registerVerified(h, 'code')).email;
    });

    it('emails a 6-digit code and never returns a token from the password step', async () => {
      const start = await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
      expect(start.body).toMatchObject({ status: 'code_required' });
      expect(start.body.email).toMatch(/•/); // masked
      expect(h.mail.codeFor(email)).toMatch(/^\d{6}$/);
      const row = await h.prisma.authChallenge.findUniqueOrThrow({ where: { id: start.body.challengeId } });
      expect(row.codeHash).not.toContain(h.mail.codeFor(email)); // only an HMAC is stored
    });

    it('rejects a wrong code, locks after 5 attempts, and a used code cannot be reused', async () => {
      const start = await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
      const id = start.body.challengeId;
      const good = h.mail.codeFor(email);
      const bad = good === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) await h.http().post('/api/auth/login/verify').send({ challengeId: id, code: bad }).expect(400);
      const locked = await h.http().post('/api/auth/login/verify').send({ challengeId: id, code: good }).expect(400);
      expect(locked.body.message).toMatch(/Too many/);

      const again = await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
      const ok = h.mail.codeFor(email);
      await h.http().post('/api/auth/login/verify').send({ challengeId: again.body.challengeId, code: ok }).expect(200);
      await h.http().post('/api/auth/login/verify').send({ challengeId: again.body.challengeId, code: ok }).expect(400);
    });

    it('rejects expired codes and malformed input', async () => {
      const start = await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
      await h.prisma.authChallenge.update({ where: { id: start.body.challengeId }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await h.http().post('/api/auth/login/verify').send({ challengeId: start.body.challengeId, code: h.mail.codeFor(email) }).expect(400);
      await h.http().post('/api/auth/login/verify').send({ challengeId: 'nope', code: '123456' }).expect(400);
      await h.http().post('/api/auth/login/verify').send({ challengeId: start.body.challengeId, code: '12ab56' }).expect(400);
    });

    it('resends a fresh code, with a cooldown', async () => {
      const start = await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
      const first = h.mail.codeFor(email);
      await h.http().post('/api/auth/login/resend').send({ challengeId: start.body.challengeId }).expect(429);
      await h.prisma.authChallenge.update({ where: { id: start.body.challengeId }, data: { lastSentAt: new Date(Date.now() - 60_000) } });
      await h.http().post('/api/auth/login/resend').send({ challengeId: start.body.challengeId }).expect(200);
      const second = h.mail.codeFor(email);
      if (first !== second) {
        await h.http().post('/api/auth/login/verify').send({ challengeId: start.body.challengeId, code: first }).expect(400);
      }
      await h.http().post('/api/auth/login/verify').send({ challengeId: start.body.challengeId, code: second }).expect(200);
    });
  });

  describe('password reset', () => {
    let user: Awaited<ReturnType<typeof registerVerified>>;
    const NEW = 'N3w-Passw0rd!';
    const linkToken = (email: string) => {
      const mail = [...h.mail.sent].reverse().find((m) => m.to.email === email && m.tags?.includes('password-reset'));
      return mail!.text.match(/reset-password\?token=([a-f0-9]{64})/)![1];
    };

    beforeAll(async () => {
      user = await registerVerified(h, 'reset');
    });

    it('answers the same way for known and unknown emails', async () => {
      const a = await h.http().post('/api/auth/password/forgot').send({ email: user.email }).expect(202);
      const b = await h.http().post('/api/auth/password/forgot').send({ email: 'nobody@client.test' }).expect(202);
      expect(a.body).toEqual(b.body);
      expect(linkToken(user.email)).toMatch(/^[a-f0-9]{64}$/);
    });

    it('requires matching passwords that meet the rules', async () => {
      const token = linkToken(user.email);
      await h.http().post('/api/auth/password/reset').send({ token, password: NEW, passwordConfirm: 'Different-1' }).expect(400);
      await h.http().post('/api/auth/password/reset').send({ token, password: 'weak', passwordConfirm: 'weak' }).expect(400);
    });

    it('changes the password once, signs out old sessions and emails a notice', async () => {
      const token = linkToken(user.email);
      await new Promise((r) => setTimeout(r, 1100)); // old session must be issued in an earlier second
      await h.http().post('/api/auth/password/reset').send({ token, password: NEW, passwordConfirm: NEW }).expect(200);
      await h.http().post('/api/auth/password/reset').send({ token, password: NEW, passwordConfirm: NEW }).expect(400);
      await h.http().get('/api/auth/me').set(user.auth).expect(401);
      await h.http().post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);
      await h.http().post('/api/auth/login').send({ email: user.email, password: NEW }).expect(200);
      expect(h.mail.sent.some((m) => m.to.email === user.email && m.tags?.includes('password-changed'))).toBe(true);
    });

    it('rejects expired links', async () => {
      await h.http().post('/api/auth/password/forgot').send({ email: user.email });
      await h.prisma.user.update({ where: { id: user.id }, data: { passwordResetExpiresAt: new Date(Date.now() - 1000) } });
      const mail = [...h.mail.sent].reverse().find((m) => m.to.email === user.email && m.tags?.includes('password-reset'));
      const token = mail?.text.match(/reset-password\?token=([a-f0-9]{64})/)?.[1];
      if (token) await h.http().post('/api/auth/password/reset').send({ token, password: NEW, passwordConfirm: NEW }).expect(400);
    });
  });

  describe('suspension', () => {
    it('lets an admin suspend and restore an account, with audit entries', async () => {
      const admin = await registerVerified(h, 'susp-admin');
      await h.prisma.user.update({ where: { id: admin.id }, data: { role: UserRole.ADMIN } });
      const client = await registerVerified(h, 'susp-client');

      await h.http().post(`/api/admin/users/${client.id}/suspend`).set(admin.auth).send({ reason: 'Suspicious activity review' }).expect(200);
      await h.http().get('/api/auth/me').set(client.auth).expect(401);
      const blocked = await h.http().post('/api/auth/login').send({ email: client.email, password: PASSWORD }).expect(403);
      expect(blocked.body.message).toMatch(/suspended/);
      await h.http().post(`/api/admin/users/${admin.id}/suspend`).set(admin.auth).send({ reason: 'Trying to lock myself' }).expect(400);

      await h.http().post(`/api/admin/users/${client.id}/unsuspend`).set(admin.auth).expect(200);
      await h.http().post('/api/auth/login').send({ email: client.email, password: PASSWORD }).expect(200);
      expect(await h.prisma.adminAuditLog.count({ where: { targetId: client.id, action: { in: ['user.suspend', 'user.unsuspend'] } } })).toBe(2);
    });
  });
});
