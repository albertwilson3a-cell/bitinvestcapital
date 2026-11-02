/**
 * Shared bootstrap for the platform suites. Boots the real AppModule against the
 * test database (real Prisma, real PostgreSQL relations, real Redis). Only the two
 * external services are replaced:
 *   - email delivery: captured in memory so tests can read the verification link;
 *   - market prices: fixed, so referral-bonus maths is exact.
 */
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { configureApp } from '../../../src/app.setup.js';
import { Prisma } from '../../../src/generated/prisma/client.js';
import { MAIL_TRANSPORT, type MailTransport, type OutgoingMail } from '../../../src/mail/mail.types.js';
import { PriceService, PriceUnavailableError } from '../../../src/payments/price.service.js';
import { signWebhookPayload } from '../../../src/payments/webhook-signature.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';

export const PASSWORD = 'Str0ng-Passw0rd!';
export const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
export const FIXED_PRICES: Record<string, string> = { USDT: '1', BTC: '60000', ETH: '3000' };

export class CapturingMail implements MailTransport {
  readonly name = 'capture';
  readonly sent: OutgoingMail[] = [];
  async send(mail: OutgoingMail) {
    this.sent.push(mail);
    return { provider: this.name, messageId: String(this.sent.length) };
  }
  tokenFor(email: string): string {
    const mail = [...this.sent].reverse().find((m) => m.to.email === email);
    const token = mail?.text.match(/\/verify\?token=([a-f0-9]{64})/)?.[1];
    if (!token) throw new Error(`No verification email captured for ${email}`);
    return token;
  }
  /** The 6-digit code from the latest code email (sign-in or withdrawal) sent to this address. */
  codeFor(email: string, tag: 'login-code' | 'withdrawal-code' = 'login-code'): string {
    const mail = [...this.sent].reverse().find((m) => m.to.email === email && m.tags?.includes(tag));
    const code = mail?.text.match(/Your code: (\d{6})/)?.[1];
    if (!code) throw new Error(`No ${tag} email captured for ${email}`);
    return code;
  }
}

export const fixedPrices = {
  getUsdPrice: async (asset: string) => {
    const p = FIXED_PRICES[asset];
    if (!p) throw new PriceUnavailableError(asset);
    return new Prisma.Decimal(p);
  },
  getSnapshot: async () => ({
    source: 'coingecko' as const,
    updatedAt: new Date().toISOString(),
    quotes: Object.entries(FIXED_PRICES).map(([asset, usd]) => ({ asset, usd, change24hPercent: 0 })),
  }),
};

export interface Harness {
  app: INestApplication<App>;
  moduleRef: TestingModule;
  prisma: PrismaService;
  mail: CapturingMail;
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

/** Boots the API. `listen: false` builds the DI container only (for handler-level tests). */
export async function bootstrap(opts: { listen?: boolean } = {}): Promise<Harness> {
  const mail = new CapturingMail();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_TRANSPORT)
    .useValue(mail)
    .overrideProvider(PriceService)
    .useValue(fixedPrices)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ rawBody: true });
  configureApp(app);
  if (opts.listen !== false) await app.init();
  return {
    app,
    moduleRef,
    prisma: app.get(PrismaService),
    mail,
    http: () => request(app.getHttpServer()),
    close: () => app.close(),
  };
}

export const uniqueEmail = (label: string) => `${label}.${randomBytes(4).toString('hex')}@client.test`;

/** Registers through the API and confirms through the real emailed link. */
export async function registerVerified(h: Harness, label: string, referralCode?: string) {
  const email = uniqueEmail(label);
  const reg = await h.http().post('/api/auth/register').send({ email, password: PASSWORD, referralCode }).expect(201);
  await h.http().get('/api/auth/verify').query({ token: h.mail.tokenFor(email) }).expect(200);
  const start = await h.http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  const login = await h.http().post('/api/auth/login/verify').send({ challengeId: start.body.challengeId, code: h.mail.codeFor(email) }).expect(200);
  return {
    id: reg.body.user.id as string,
    email,
    referralCode: reg.body.user.referralCode as string,
    jwt: login.body.accessToken as string,
    auth: { Authorization: `Bearer ${login.body.accessToken}` },
  };
}

export function postWebhook(h: Harness, payload: object, opts: { secret?: string; timestamp?: number } = {}) {
  const body = JSON.stringify(payload);
  const secret = opts.secret ?? process.env.WEBHOOK_SIGNING_SECRETS!.split(',')[0];
  return h
    .http()
    .post('/payments/webhook')
    .set('content-type', 'application/json')
    .set('x-webhook-signature', signWebhookPayload(secret, body, opts.timestamp))
    .send(body);
}

export const evmHash = () => `0x${randomBytes(32).toString('hex')}`;
export const btcHash = () => randomBytes(32).toString('hex');
export const eventId = () => `evt_${randomBytes(10).toString('hex')}`;

export async function balanceOf(h: Harness, userId: string, asset: 'USDT' | 'ETH' | 'BTC') {
  return h.prisma.balance.findUniqueOrThrow({ where: { userId_assetType: { userId, assetType: asset } } });
}
