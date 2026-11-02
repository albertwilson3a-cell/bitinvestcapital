/**
 * Shared, table-based email shell (renders consistently in Gmail, Outlook and
 * Apple Mail): brand header, content slot, and the corporate footer. Every
 * transactional email uses it, so branding changes happen in one place.
 */

export interface BrandContext {
  name: string; // "BitInvest Capital"
  websiteUrl: string; // "https://bitinvestcapital.com"
  supportEmail: string; // "support@bitinvestcapital.com"
  postalAddress?: string;
  year?: number;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = '#0a1220';
const BRASS = '#b8955a';

export function renderLayout(opts: {
  brand: BrandContext;
  title: string;
  preheader: string;
  recipientEmail: string;
  reason: string; // why the recipient got this email
  bodyHtml: string;
}): string {
  const b = opts.brand;
  const name = escapeHtml(b.name);
  const site = escapeHtml(b.websiteUrl);
  const host = escapeHtml(hostOf(b.websiteUrl));
  const support = escapeHtml(b.supportEmail);
  const year = b.year ?? new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef0f4;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef0f4;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">
          <!-- Brand header -->
          <tr>
            <td style="background-color:${INK};border-radius:12px 12px 0 0;padding:22px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;line-height:0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="width:16px;height:3px;background:#2a3a56;border-radius:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr><td style="height:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr><td style="width:12px;height:3px;background:#8a96ab;border-radius:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr><td style="height:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr><td style="width:8px;height:3px;background:${BRASS};border-radius:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                  <td style="font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#e6eaf2;">
                    <a href="${site}" style="color:#e6eaf2;text-decoration:none;">${name}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:3px;background-color:${BRASS};font-size:0;line-height:0;">&nbsp;</td></tr>
          <!-- Content -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px 30px 40px;font-family:${FONT};border-left:1px solid #e3e6ec;border-right:1px solid #e3e6ec;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <!-- Corporate footer -->
          <tr>
            <td style="background-color:#f7f8fa;border:1px solid #e3e6ec;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px 28px 40px;font-family:${FONT};font-size:12px;line-height:19px;color:#5b6577;">
              <p style="margin:0 0 10px 0;">
                <a href="${site}" style="color:${INK};font-weight:600;text-decoration:none;">${name}</a><br>
                <a href="${site}" style="color:#5b6577;text-decoration:underline;">${host}</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="mailto:${support}" style="color:#5b6577;text-decoration:underline;">${support}</a>
              </p>
              <p style="margin:0 0 10px 0;">
                This email was sent to ${escapeHtml(opts.recipientEmail)} because ${escapeHtml(opts.reason)}
              </p>
              <p style="margin:0 0 10px 0;color:#7a8394;">
                Digital assets are volatile and their value can fall as well as rise. Yields are variable, are not guaranteed and
                may be changed or paused. ${name} will never ask for your password or recovery phrase by email.
              </p>
              <p style="margin:0;color:#7a8394;">
                &copy; ${year} ${name}${b.postalAddress ? `. ${escapeHtml(b.postalAddress)}` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderTextFooter(brand: BrandContext, recipientEmail: string, reason: string): string {
  return [
    '--',
    brand.name,
    brand.websiteUrl,
    `Support: ${brand.supportEmail}`,
    '',
    `This email was sent to ${recipientEmail} because ${reason}`,
    'Digital assets are volatile and their value can fall as well as rise. Yields are variable, are not guaranteed and may be changed or paused.',
    `${brand.name} will never ask for your password or recovery phrase by email.`,
    brand.postalAddress ? `© ${brand.year ?? new Date().getFullYear()} ${brand.name}. ${brand.postalAddress}` : `© ${brand.year ?? new Date().getFullYear()} ${brand.name}`,
  ].join('\n');
}
