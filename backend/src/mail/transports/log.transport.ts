import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MailDeliveryResult, MailTransport, OutgoingMail } from '../mail.types.js';

/**
 * Development transport: writes the plain-text body to the log instead of
 * sending. Rejected at startup when NODE_ENV=production.
 */
export class LogTransport implements MailTransport {
  readonly name = 'log';
  private readonly logger = new Logger('MailLog');

  async send(mail: OutgoingMail): Promise<MailDeliveryResult> {
    const messageId = randomUUID();
    this.logger.log(
      `\n── email ${messageId} ──\nTo: ${mail.to.email}\nSubject: ${mail.subject}\n\n${mail.text}\n──────────`,
    );
    return { provider: this.name, messageId };
  }
}
