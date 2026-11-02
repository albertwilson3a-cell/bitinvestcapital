import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import {
  formatAddress,
  type MailDeliveryResult,
  type MailTransport,
  type OutgoingMail,
} from '../mail.types.js';

/**
 * Amazon SES (v2 API). Credentials come from the standard AWS provider chain
 * (env vars, shared config, or an attached IAM role).
 */
export class SesTransport implements MailTransport {
  readonly name = 'ses';
  private readonly client: SESv2Client;

  constructor(
    region: string,
    private readonly configurationSet?: string,
  ) {
    this.client = new SESv2Client({ region });
  }

  async send(mail: OutgoingMail): Promise<MailDeliveryResult> {
    const result = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: formatAddress(mail.from),
        Destination: { ToAddresses: [formatAddress(mail.to)] },
        ConfigurationSetName: this.configurationSet,
        EmailTags: mail.tags?.map((t) => ({ Name: 'category', Value: t.replace(/[^\w-]/g, '_') })),
        Content: {
          Simple: {
            Subject: { Data: mail.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: mail.html, Charset: 'UTF-8' },
              Text: { Data: mail.text, Charset: 'UTF-8' },
            },
          },
        },
      }),
    );
    return { provider: this.name, messageId: result.MessageId };
  }
}
