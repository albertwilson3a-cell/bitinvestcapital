import { describe, expect, it } from 'vitest';
import { MailProvider, validateEnv } from './env.validation.js';

const base = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db?schema=public',
  REDIS_CLUSTER_NODES: '127.0.0.1:7001',
  JWT_SECRET: 'x'.repeat(64),
  MAIL_FROM_ADDRESS: 'no-reply@bitinvestcapital.com',
  ETH_ACCOUNT_XPUB:
    'xpub6DCoCpSuQZB2jawqnGMEPS63ePKWkwWPH4TU45Q7LPXWuNd8TMtVxRrgjtEshuqpK3mdhaWHPFsBngh5GFZaM6si3yZdUsT8ddYM3PwnATt',
  BTC_ACCOUNT_XPUB:
    'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
  WEBHOOK_SIGNING_SECRETS: 'whsec_' + 'y'.repeat(40),
  PRICE_PROVIDER: 'simulated',
  FRONTEND_URL: 'http://localhost:5173',
};

describe('validateEnv — SMTP mail provider', () => {
  it('requires SMTP_HOST when MAIL_PROVIDER=smtp', () => {
    expect(() => validateEnv({ ...base, MAIL_PROVIDER: 'smtp' })).toThrow(/SMTP_HOST is required/);
  });

  it('defaults to port 587 with STARTTLS', () => {
    const env = validateEnv({ ...base, MAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.gmail.com' });
    expect(env.MAIL_PROVIDER).toBe(MailProvider.Smtp);
    expect(env.SMTP_PORT).toBe(587);
    expect(env.SMTP_SECURE).toBe(false);
  });

  it('reads SMTP_SECURE strictly: only "true" enables implicit TLS', () => {
    const on = validateEnv({ ...base, MAIL_PROVIDER: 'smtp', SMTP_HOST: 'h', SMTP_PORT: '465', SMTP_SECURE: 'true' });
    const off = validateEnv({ ...base, MAIL_PROVIDER: 'smtp', SMTP_HOST: 'h', SMTP_SECURE: 'false' });
    expect(on.SMTP_PORT).toBe(465);
    expect(on.SMTP_SECURE).toBe(true);
    expect(off.SMTP_SECURE).toBe(false);
  });

  it('does not require SMTP settings for other providers', () => {
    expect(() => validateEnv({ ...base, MAIL_PROVIDER: 'log' })).not.toThrow();
  });
});
