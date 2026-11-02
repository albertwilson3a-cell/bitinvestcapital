import { createTransport, type Transporter } from 'nodemailer';
import type { MailDeliveryResult, MailTransport, OutgoingMail } from '../mail.types.js';
import { formatAddress } from '../mail.types.js';

export interface SmtpOptions {
  host: string;
  port: number;
  /** true = TLS from the first byte (port 465). false = STARTTLS upgrade (port 587). */
  secure: boolean;
  user?: string;
  password?: string;
}

/**
 * Works with any standard mailbox or relay: Gmail / Google Workspace,
 * Microsoft 365, Zoho, Brevo, Mailgun, Postmark, SendGrid SMTP, SES SMTP, etc.
 */
export class SmtpTransport implements MailTransport {
  readonly name = 'smtp';
  private readonly transporter: Transporter;

  constructor(options: SmtpOptions) {
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      // On 587, refuse to send credentials or mail over an unencrypted link.
      requireTLS: !options.secure,
      auth: options.user ? { user: options.user, pass: options.password ?? '' } : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }

  /** Checks host, port, TLS and login without sending anything. */
  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async send(mail: OutgoingMail): Promise<MailDeliveryResult> {
    const info = await this.transporter.sendMail({
      from: formatAddress(mail.from),
      to: formatAddress(mail.to),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: mail.tags?.length ? { 'X-Mail-Tags': mail.tags.join(',') } : undefined,
    });
    return { provider: this.name, messageId: info.messageId };
  }
}
