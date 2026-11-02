import {
  parseSignatureHeader,
  signWebhookPayload,
  verifyWebhookSignature,
  WebhookSignatureError,
} from './webhook-signature.js';

const SECRET = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const body = Buffer.from('{"id":"evt_1","amount":"1.5"}');
const now = 1_800_000_000;

const verify = (header: string | undefined, overrides: Partial<Parameters<typeof verifyWebhookSignature>[0]> = {}) =>
  verifyWebhookSignature({ rawBody: body, header, secrets: [SECRET], toleranceSeconds: 300, nowSeconds: now, ...overrides });

const reason = (fn: () => void) => {
  try {
    fn();
    return 'passed';
  } catch (e) {
    return e instanceof WebhookSignatureError ? e.reason : 'other';
  }
};

describe('webhook signature', () => {
  it('accepts a valid signature', () => {
    expect(reason(() => verify(signWebhookPayload(SECRET, body, now)))).toBe('passed');
  });

  it('rejects a tampered body (amount changed)', () => {
    const header = signWebhookPayload(SECRET, body, now);
    const tampered = Buffer.from('{"id":"evt_1","amount":"9.5"}');
    expect(reason(() => verify(header, { rawBody: tampered }))).toBe('signature_mismatch');
  });

  it('rejects a swapped timestamp (signature bound to t)', () => {
    const sig = signWebhookPayload(SECRET, body, now).split(',')[1];
    expect(reason(() => verify(`t=${now - 10},${sig}`))).toBe('signature_mismatch');
  });

  it('rejects stale or future timestamps (replay window)', () => {
    expect(reason(() => verify(signWebhookPayload(SECRET, body, now - 301)))).toBe('timestamp_outside_tolerance');
    expect(reason(() => verify(signWebhookPayload(SECRET, body, now + 301)))).toBe('timestamp_outside_tolerance');
  });

  it('rejects the wrong secret and accepts rotated secrets', () => {
    expect(reason(() => verify(signWebhookPayload(OLD, body, now)))).toBe('signature_mismatch');
    expect(reason(() => verify(signWebhookPayload(OLD, body, now), { secrets: [SECRET, OLD] }))).toBe('passed');
  });

  it('rejects malformed headers', () => {
    expect(reason(() => verify(undefined))).toBe('missing_or_oversized_header');
    expect(reason(() => verify('v1=' + 'a'.repeat(64)))).toBe('missing_timestamp');
    expect(reason(() => verify(`t=${now},v1=xyz`))).toBe('missing_v1_signature');
    expect(reason(() => verify(`t=${now},v1=${'a'.repeat(64)}`, { rawBody: Buffer.alloc(0) }))).toBe('empty_body');
  });

  it('parses multiple v1 entries', () => {
    expect(parseSignatureHeader(`t=5,v1=${'a'.repeat(64)},v1=${'b'.repeat(64)}`).signatures).toHaveLength(2);
  });
});
