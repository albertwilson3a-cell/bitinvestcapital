import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BRAND } from '../config/brand.js';
import { MAIL_TRANSPORT, type MailDeliveryResult, type MailTransport } from './mail.types.js';
import type { BrandContext } from './templates/layout.js';
import { renderNoticeEmail, type NoticeEmailParams } from './templates/notice-email.js';
import { describeDuration, renderVerificationEmail } from './templates/verification-email.js';

export function buildVerificationUrl(frontendUrl: string, token: string): string {
  const base = frontendUrl.replace(/\/+$/, '');
  return `${base}/verify?token=${encodeURIComponent(token)}`;
}

@Injectable()
export class MailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailService.name);
  private readonly brand: BrandContext;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    private readonly config: ConfigService,
  ) {
    this.brand = {
      name: config.get<string>('APP_NAME') || BRAND.name,
      websiteUrl: config.get<string>('MAIL_WEBSITE_URL') || BRAND.websiteUrl,
      supportEmail: config.get<string>('MAIL_SUPPORT_ADDRESS') || BRAND.supportEmail,
      postalAddress: config.get<string>('MAIL_POSTAL_ADDRESS') || undefined,
    };
  }

  /**
   * Surfaces a wrong host, port or password at startup instead of at the first
   * sign-up. Runs in the background so a slow mail server never delays boot.
   */
  onApplicationBootstrap(): void {
    if (!this.transport.verify) return;
    this.transport.verify().then(
      () => this.logger.log(`Mail provider "${this.transport.name}" is reachable and accepted the login`),
      (err: unknown) =>
        this.logger.error(
          `Mail provider "${this.transport.name}" check failed — emails will not be delivered: ${err instanceof Error ? err.message : String(err)}`,
        ),
    );
  }

  async sendVerificationEmail(to: string, token: string, expiresInMinutes: number): Promise<MailDeliveryResult> {
    const verifyUrl = buildVerificationUrl(this.config.getOrThrow<string>('FRONTEND_URL'), token);
    const { subject, html, text } = renderVerificationEmail({ brand: this.brand, recipientEmail: to, verifyUrl, expiresInMinutes });

    const result = await this.transport.send({
      to: { email: to },
      from: {
        email: this.config.get<string>('MAIL_FROM_ADDRESS') || BRAND.noReplyEmail,
        name: this.config.get<string>('MAIL_FROM_NAME') || this.brand.name,
      },
      subject,
      html,
      text,
      tags: ['email-verification'],
    });
    this.logger.log(`Verification email sent via ${result.provider} (id=${result.messageId ?? 'n/a'})`);
    return result;
  }

  // ── account security ─────────────────────────────────────────────

  async sendLoginCode(to: string, code: string, ttlMinutes: number) {
    return this.notice(to, {
      subject: `${code} is your ${this.brand.name} sign-in code`,
      preheader: `Use this code to finish signing in. It expires in ${describeDuration(ttlMinutes)}.`,
      heading: 'Your sign-in code',
      paragraphs: ['Someone (hopefully you) entered your email and password. Enter this code to finish signing in:'],
      code,
      footnote: `The code expires in ${describeDuration(ttlMinutes)} and works once. If this wasn’t you, change your password straight away.`,
      reason: 'a sign-in was attempted on your account.',
    }, ['login-code']);
  }

  async sendPasswordReset(to: string, token: string, ttlMinutes: number) {
    const base = this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/+$/, '');
    return this.notice(to, {
      subject: `Reset your ${this.brand.name} password`,
      preheader: `Choose a new password. The link expires in ${describeDuration(ttlMinutes)}.`,
      heading: 'Reset your password',
      paragraphs: ['We received a request to reset the password for your account. Choose a new password using the button below.'],
      button: { url: `${base}/reset-password?token=${encodeURIComponent(token)}`, label: 'Choose a new password' },
      footnote: `This link expires in ${describeDuration(ttlMinutes)} and can be used once. If you didn’t ask for this, ignore this email; your password won’t change.`,
      reason: 'a password reset was requested for your account.',
    }, ['password-reset']);
  }

  async sendPasswordChanged(to: string) {
    return this.notice(to, {
      subject: `Your ${this.brand.name} password was changed`,
      preheader: 'Your password was just changed and other sessions were signed out.',
      heading: 'Your password was changed',
      paragraphs: [
        'The password for your account was just changed, and any other signed-in sessions were signed out.',
        `If you didn’t do this, contact ${this.brand.supportEmail} immediately.`,
      ],
      reason: 'the password on your account changed.',
    }, ['password-changed']);
  }

  // ── withdrawals ──────────────────────────────────────────────────

  async sendWithdrawalCode(to: string, code: string, ttlMinutes: number, details: { label: string; value: string }[]) {
    return this.notice(to, {
      subject: `${code} is your ${this.brand.name} withdrawal confirmation code`,
      preheader: 'Confirm your withdrawal request with this code.',
      heading: 'Confirm your withdrawal',
      paragraphs: ['Enter this code to confirm the withdrawal request below. Our team reviews every withdrawal before funds are sent.'],
      code,
      details,
      footnote: `The code expires in ${describeDuration(ttlMinutes)}. If you didn’t request this withdrawal, don’t share the code: change your password and contact support.`,
      reason: 'a withdrawal was requested from your account.',
    }, ['withdrawal-code']);
  }

  async sendWithdrawalUpdate(to: string, heading: string, paragraphs: string[], details: { label: string; value: string }[], tag: string) {
    return this.notice(to, {
      subject: `${heading} | ${this.brand.name}`,
      preheader: paragraphs[0] ?? heading,
      heading,
      paragraphs,
      details,
      reason: 'there is an update on a withdrawal from your account.',
    }, [tag]);
  }

  private async notice(to: string, p: Omit<NoticeEmailParams, 'brand' | 'recipientEmail'>, tags: string[]) {
    const { subject, html, text } = renderNoticeEmail({ ...p, brand: this.brand, recipientEmail: to });
    const result = await this.transport.send({
      to: { email: to },
      from: { email: this.config.get<string>('MAIL_FROM_ADDRESS') || BRAND.noReplyEmail, name: this.config.get<string>('MAIL_FROM_NAME') || this.brand.name },
      subject,
      html,
      text,
      tags,
    });
    this.logger.log(`Email "${tags[0]}" sent via ${result.provider} (id=${result.messageId ?? 'n/a'})`);
    return result;
  }
}
