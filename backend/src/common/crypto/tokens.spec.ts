import {
  generateReferralCode,
  hashToken,
  issueVerificationToken,
  REFERRAL_CODE_ALPHABET,
  VERIFICATION_TOKEN_PATTERN,
} from './tokens.js';

describe('verification tokens', () => {
  it('issues a 64-hex token whose stored hash differs from the token', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const issued = issueVerificationToken(30, now);
    expect(issued.token).toMatch(VERIFICATION_TOKEN_PATTERN);
    expect(issued.hash).toMatch(VERIFICATION_TOKEN_PATTERN);
    expect(issued.hash).not.toBe(issued.token);
    expect(hashToken(issued.token)).toBe(issued.hash);
    expect(issued.expiresAt.toISOString()).toBe('2026-01-01T00:30:00.000Z');
  });

  it('never repeats tokens', () => {
    const set = new Set(Array.from({ length: 1000 }, () => issueVerificationToken(5).token));
    expect(set.size).toBe(1000);
  });
});

describe('referral codes', () => {
  it('are 8 chars from the unambiguous alphabet', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateReferralCode();
      expect(code).toHaveLength(8);
      for (const ch of code) expect(REFERRAL_CODE_ALPHABET).toContain(ch);
    }
  });
});
