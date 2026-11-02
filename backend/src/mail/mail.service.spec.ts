import { BRAND } from '../config/brand.js';
import { buildVerificationUrl } from './mail.service.js';
import { describeDuration, escapeHtml, renderVerificationEmail } from './templates/verification-email.js';

const brand = { name: BRAND.name, websiteUrl: BRAND.websiteUrl, supportEmail: BRAND.supportEmail, year: 2026 };

describe('verification email', () => {
  it('builds the link as FRONTEND_URL/verify?token=…', () => {
    expect(buildVerificationUrl('https://bitinvestcapital.com/', 'ab12')).toBe('https://bitinvestcapital.com/verify?token=ab12');
  });

  it('is branded BitInvest Capital with a corporate footer linking to https://bitinvestcapital.com', () => {
    const out = renderVerificationEmail({
      brand: { ...brand, postalAddress: 'Registered office, Nairobi' },
      recipientEmail: 'jane@client.test',
      verifyUrl: 'https://bitinvestcapital.com/verify?token=abc',
      expiresInMinutes: 1440,
    });
    expect(out.subject).toBe('Confirm your email to activate your BitInvest Capital account');
    expect(out.html).toContain('href="https://bitinvestcapital.com"');
    expect(out.html).toContain('>bitinvestcapital.com</a>');
    expect(out.html).toContain('mailto:support@bitinvestcapital.com');
    expect(out.html).toContain('&copy; 2026 BitInvest Capital. Registered office, Nairobi');
    expect(out.html).toContain('This email was sent to jane@client.test');
    expect(out.html).toMatch(/Yields are variable, are not guaranteed/);
    expect(out.text).toContain('https://bitinvestcapital.com');
    expect(out.text).toContain('Support: support@bitinvestcapital.com');
  });

  it('omits the address line when none is configured, and escapes user data', () => {
    const url = 'https://bitinvestcapital.com/verify?token=abc&x=1';
    const out = renderVerificationEmail({ brand, recipientEmail: '<script>@x.io', verifyUrl: url, expiresInMinutes: 1440 });
    expect(out.html).toContain(`href="${escapeHtml(url)}"`);
    expect(out.html).not.toContain('<script>@x.io');
    expect(out.html).toContain('&copy; 2026 BitInvest Capital\n');
    expect(out.html).toContain('expires in 1 day');
  });

  it('describes durations', () => {
    expect(describeDuration(30)).toBe('30 minutes');
    expect(describeDuration(120)).toBe('2 hours');
    expect(describeDuration(2880)).toBe('2 days');
  });
});
