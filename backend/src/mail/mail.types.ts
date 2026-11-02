export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export interface MailAddress {
  email: string;
  name?: string;
}

export interface OutgoingMail {
  to: MailAddress;
  from: MailAddress;
  subject: string;
  html: string;
  text: string;
  /** Free-form tags for provider analytics (SendGrid categories / SES tags). */
  tags?: string[];
}

export interface MailDeliveryResult {
  provider: string;
  messageId?: string;
}

/** Provider-agnostic transport. Implement once per vendor. */
export interface MailTransport {
  readonly name: string;
  send(mail: OutgoingMail): Promise<MailDeliveryResult>;
  /** Optional connectivity/login check, run once at startup. */
  verify?(): Promise<void>;
}

export function formatAddress({ email, name }: MailAddress): string {
  if (!name) return email;
  const safe = name.replace(/["\\\r\n]/g, '');
  return `"${safe}" <${email}>`;
}
