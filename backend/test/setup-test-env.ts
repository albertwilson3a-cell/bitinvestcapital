/**
 * Test suites are written for per-client (xpub-derived) deposit addresses.
 * A developer's .env may switch shared addresses on; blank them here so the
 * suites never depend on local settings. Suites that test shared addresses
 * set them again themselves (see test/platform/deposit-claims.spec.ts).
 */
Object.assign(process.env, {
  DEPOSIT_ADDRESS_BTC: '',
  DEPOSIT_ADDRESS_ETH: '',
  DEPOSIT_ADDRESS_USDT: '',
});
