import { createHash, randomBytes, randomInt } from 'node:crypto';

/** 32 random bytes → 64 hex chars. */
export const VERIFICATION_TOKEN_BYTES = 32;
export const VERIFICATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export interface IssuedToken {
  /** Raw value — only ever sent to the user, never persisted. */
  token: string;
  /** SHA-256 hex digest — the value stored in the database. */
  hash: string;
  expiresAt: Date;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function issueVerificationToken(ttlMinutes: number, now: Date = new Date()): IssuedToken {
  const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60_000),
  };
}

/** Uppercase letters and digits minus look-alikes (0/O, 1/I/L). */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6,16}$/;

export function generateReferralCode(length: number = REFERRAL_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}
