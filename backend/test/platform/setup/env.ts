/**
 * Loaded before every platform test file, before the AppModule is imported
 * (ConfigModule reads the environment at import time). Points the API at the
 * test database and fixes every value the suites depend on.
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  REDIS_KEY_PREFIX: 'bitinvest-test:',
  REDIS_NAT_MAP: process.env.REDIS_NAT_MAP ?? '',
  BCRYPT_ROUNDS: '10',
  MAIL_PROVIDER: 'log',
  FRONTEND_URL: 'https://bitinvestcapital.com',
  JWT_ISSUER: 'https://bitinvestcapital.com',
  JWT_AUDIENCE: 'https://bitinvestcapital.com',
  WEBHOOK_SIGNING_SECRETS: 'whsec_platform_suite_' + 'x'.repeat(32),
  WEBHOOK_TOLERANCE_SECONDS: '300',
  USDT_CONTRACT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  MIN_CONFIRMATIONS_BTC: '3',
  MIN_CONFIRMATIONS_ETH: '12',
  MIN_CONFIRMATIONS_USDT: '12',
  REFERRAL_REWARD_RATE: '0.01',
  AFFILIATE_YIELD_REWARD_RATE: '0.05',
  VERIFICATION_TOKEN_TTL_MINUTES: '1440',
  VERIFICATION_RESEND_COOLDOWN_SECONDS: '0',
  // The real cron must not fire during HTTP suites; the cron suite drives the handler itself.
  YIELD_SCHEDULER_ENABLED: 'false',
  YIELD_BATCH_SIZE: '50',
  PRICE_PROVIDER: 'simulated', // market pages: deterministic, no network
});
