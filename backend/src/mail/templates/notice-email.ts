import { escapeHtml, renderLayout, renderTextFooter, type BrandContext } from './layout.js';
import type { RenderedEmail } from './verification-email.js';

/**
 * General transactional email: heading, paragraphs, and optionally a large
 * one-time code, a key/value summary table and/or a button with a fallback link.
 */
export interface NoticeEmailParams {
  brand: BrandContext;
  recipientEmail: string;
  subject: string;
  preheader: string;
  heading: string;
  paragraphs: string[];
  code?: string;
  details?: { label: string; value: string }[];
  button?: { url: string; label: string };
  footnote?: string;
  reason: string;
}

export function renderNoticeEmail(p: NoticeEmailParams): RenderedEmail {
  const paras = p.paragraphs
    .map((t) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#374151;">${escapeHtml(t)}</p>`)
    .join('');
  const code = p.code
    ? `<p style="margin:8px 0 24px 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;line-height:40px;letter-spacing:10px;font-weight:700;color:#0a1220;">${escapeHtml(p.code)}</p>`
    : '';
  const details = p.details?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px 0;border:1px solid #e5e7eb;border-radius:8px;">
        ${p.details
          .map(
            (d) => `<tr>
              <td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f1f2f4;">${escapeHtml(d.label)}</td>
              <td style="padding:10px 14px;font-size:13px;color:#0a1220;text-align:right;word-break:break-all;border-bottom:1px solid #f1f2f4;">${escapeHtml(d.value)}</td>
            </tr>`,
          )
          .join('')}
      </table>`
    : '';
  const button = p.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
        <tr><td align="center" bgcolor="#0a1220" style="border-radius:8px;">
          <a href="${escapeHtml(p.button.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(p.button.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 6px 0;font-size:13px;line-height:20px;color:#6b7280;">Button not working? Paste this link into your browser:</p>
      <p style="margin:0 0 22px 0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${escapeHtml(p.button.url)}" target="_blank" rel="noopener" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(p.button.url)}</a></p>`
    : '';
  const foot = p.footnote ? `<p style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">${escapeHtml(p.footnote)}</p>` : '';

  const html = renderLayout({
    brand: p.brand,
    title: p.subject,
    preheader: p.preheader,
    recipientEmail: p.recipientEmail,
    reason: p.reason,
    bodyHtml: `<h1 style="margin:0 0 16px 0;font-size:22px;line-height:30px;font-weight:700;color:#0a1220;">${escapeHtml(p.heading)}</h1>${paras}${code}${details}${button}${foot}`,
  });

  const text = [
    p.heading,
    '',
    ...p.paragraphs.flatMap((t) => [t, '']),
    ...(p.code ? [`Your code: ${p.code}`, ''] : []),
    ...(p.details ?? []).map((d) => `${d.label}: ${d.value}`),
    ...(p.details?.length ? [''] : []),
    ...(p.button ? [`${p.button.label}: ${p.button.url}`, ''] : []),
    ...(p.footnote ? [p.footnote, ''] : []),
    renderTextFooter(p.brand, p.recipientEmail, p.reason),
  ].join('\n');

  return { subject: p.subject, html, text };
}
