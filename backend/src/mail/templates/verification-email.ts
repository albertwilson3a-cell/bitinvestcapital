import { escapeHtml, renderLayout, renderTextFooter, type BrandContext } from './layout.js';

export { escapeHtml } from './layout.js';

export interface VerificationEmailParams {
  brand: BrandContext;
  recipientEmail: string;
  verifyUrl: string;
  expiresInMinutes: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function describeDuration(minutes: number): string {
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? '' : 's'}`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function renderVerificationEmail(p: VerificationEmailParams): RenderedEmail {
  const name = escapeHtml(p.brand.name);
  const url = escapeHtml(p.verifyUrl);
  const email = escapeHtml(p.recipientEmail);
  const expiry = describeDuration(p.expiresInMinutes);
  const subject = `Confirm your email to activate your ${p.brand.name} account`;
  const reason = `an account was opened with this address at ${p.brand.name}.`;

  const body = `
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:30px;font-weight:700;color:#0a1220;">Confirm your email address</h1>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:24px;color:#374151;">
                Welcome to ${name}. You signed up with <strong style="color:#0a1220;">${email}</strong>.
                Confirm that this address belongs to you to activate your account and sign in.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td align="center" bgcolor="#0a1220" style="border-radius:8px;">
                    <a href="${url}" target="_blank" rel="noopener"
                       style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px 0;font-size:13px;line-height:20px;color:#6b7280;">Button not working? Paste this link into your browser:</p>
              <p style="margin:0 0 22px 0;font-size:13px;line-height:20px;word-break:break-all;">
                <a href="${url}" target="_blank" rel="noopener" style="color:#1d4ed8;text-decoration:underline;">${url}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">
                This link expires in ${expiry} and can be used once. If you didn’t create an account, ignore this email and no account will be activated.
              </p>`;

  const html = renderLayout({
    brand: p.brand,
    title: subject,
    preheader: `Confirm your email to finish setting up your ${p.brand.name} account. The link expires in ${expiry}.`,
    recipientEmail: p.recipientEmail,
    reason,
    bodyHtml: body,
  });

  const text = [
    'Confirm your email address',
    '',
    `Welcome to ${p.brand.name}. You signed up with ${p.recipientEmail}.`,
    'Open the link below to activate your account and sign in:',
    '',
    p.verifyUrl,
    '',
    `This link expires in ${expiry} and can be used once.`,
    'If you didn’t create an account, ignore this email.',
    '',
    renderTextFooter(p.brand, p.recipientEmail, reason),
  ].join('\n');

  return { subject, html, text };
}
