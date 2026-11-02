import { createOriginMatcher } from './cors.js';

describe('CORS origin matcher', () => {
  const allowed = createOriginMatcher('bitinvestcapital.com', ['http://localhost:5173']);

  it.each([
    'https://bitinvestcapital.com',
    'https://app.bitinvestcapital.com',
    'https://admin.bitinvestcapital.com',
    'https://eu.app.bitinvestcapital.com',
    'https://APP.BitInvestCapital.com',
    'http://localhost:5173',
  ])('allows %s', (origin) => expect(allowed(origin)).toBe(true));

  it.each([
    'http://bitinvestcapital.com', // not https
    'https://bitinvestcapital.com:8443', // non-default port
    'https://evilbitinvestcapital.com', // look-alike without a dot
    'https://bitinvestcapital.com.evil.io', // suffix attack
    'https://app.bitinvestcapital.co',
    'https://-bad.bitinvestcapital.com', // invalid label
    'https://app.bitinvestcapital.com/', // origins never carry a path
    'http://localhost:3000',
    'null',
    '',
  ])('rejects %s', (origin) => expect(allowed(origin)).toBe(false));
});
