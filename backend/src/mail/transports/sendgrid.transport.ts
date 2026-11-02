import sgMail from '@sendgrid/mail';
import type { MailDeliveryResult, MailTransport, OutgoingMail } from '../mail.types.js';

export class SendGridTransport implements MailTransport {
  readonly name = 'sendgrid';

  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(mail: OutgoingMail): Promise<MailDeliveryResult> {
    const [response] = await sgMail.send({
      to: { email: mail.to.email, name: mail.to.name },
      from: { email: mail.from.email, name: mail.from.name },
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      categories: mail.tags,
      trackingSettings: {
        // Tracking rewrites links; keep auth links untouched.
        clickTracking: { enable: false, enableText: false },
      },
    });
    const messageId = response.headers['x-message-id'];
    return { provider: this.name, messageId: typeof messageId === 'string' ? messageId : undefined };
  }
}
