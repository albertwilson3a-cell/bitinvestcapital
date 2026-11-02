import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signature scheme (header `X-Webhook-Signature`):
 *
 *   t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>." + rawBody)>
 *
 * - The timestamp is inside the signed material, so it can't be swapped to replay old payloads.
 * - Several v1 entries are allowed so the sender can sign with old + new secrets during rotation.
 * - Verification runs over the exact raw request bytes, before JSON parsing.
 */
export const SIGNATURE_HEADER = 'x-webhook-signature';
const HEX_SHA256 = /^[a-f0-9]{64}$/;

export class WebhookSignatureError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

export interface ParsedSignatureHeader {
  timestamp: number;
  signatures: string[];
}

export function parseSignatureHeader(header: string | undefined): ParsedSignatureHeader {
  if (!header || header.length > 1024) throw new WebhookSignatureError('missing_or_oversized_header');
  let timestamp: number | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=', 2);
    if (key === 't' && /^\d{1,12}$/.test(value ?? '')) timestamp = Number(value);
    else if (key === 'v1' && HEX_SHA256.test(value ?? '')) signatures.push(value);
  }
  if (timestamp === undefined) throw new WebhookSignatureError('missing_timestamp');
  if (signatures.length === 0) throw new WebhookSignatureError('missing_v1_signature');
  return { timestamp, signatures };
}

export function computeSignature(secret: string, timestamp: number, rawBody: Buffer): string {
  return createHmac('sha256', secret).update(`${timestamp}.`, 'utf8').update(rawBody).digest('hex');
}

/** Builds a header value; used by tests and by any internal sender/relay. */
export function signWebhookPayload(secret: string, rawBody: Buffer | string, timestamp = Math.floor(Date.now() / 1000)): string {
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  return `t=${timestamp},v1=${computeSignature(secret, timestamp, body)}`;
}

export interface VerifyOptions {
  rawBody: Buffer | undefined;
  header: string | undefined;
  secrets: string[];
  toleranceSeconds: number;
  nowSeconds?: number;
}

export function verifyWebhookSignature(opts: VerifyOptions): void {
  if (!opts.rawBody || opts.rawBody.length === 0) throw new WebhookSignatureError('empty_body');
  if (opts.secrets.length === 0) throw new WebhookSignatureError('no_secrets_configured');

  const { timestamp, signatures } = parseSignatureHeader(opts.header);
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > opts.toleranceSeconds) {
    throw new WebhookSignatureError('timestamp_outside_tolerance');
  }

  for (const secret of opts.secrets) {
    const expected = Buffer.from(computeSignature(secret, timestamp, opts.rawBody), 'hex');
    for (const candidate of signatures) {
      const given = Buffer.from(candidate, 'hex');
      // Both are 32 bytes (format checked above); timingSafeEqual avoids timing leaks.
      if (given.length === expected.length && timingSafeEqual(given, expected)) return;
    }
  }
  throw new WebhookSignatureError('signature_mismatch');
}
