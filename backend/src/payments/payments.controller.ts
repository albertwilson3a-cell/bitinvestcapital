import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { Public } from '../auth/decorators.js';
import { DEPOSIT_EVENT_TYPES, DepositEventDto, WebhookEnvelopeDto } from './dto/webhook-event.dto.js';
import { LedgerService, RetryableLedgerError } from './ledger.service.js';
import { WebhookSignatureGuard } from './webhook-signature.guard.js';

function flatten(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}).map((m) => (prefix ? `${prefix}.${m}` : m)),
    ...flatten(e.children ?? [], prefix ? `${prefix}.${e.property}` : e.property),
  ]);
}

/**
 * Public endpoint for the blockchain infrastructure provider. Authentication is
 * the HMAC signature (WebhookSignatureGuard), not a JWT. Excluded from the /api
 * prefix, so it is served at exactly /payments/webhook.
 */
@Public()
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly ledger: LedgerService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  async webhook(@Req() req: RawBodyRequest<Request>) {
    // Process exactly the bytes that were signed, not Express's parsed copy.
    const raw = req.rawBody!;
    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('Body must be valid JSON');
    }
    const payloadHash = createHash('sha256').update(raw).digest('hex');

    const envelope = plainToInstance(WebhookEnvelopeDto, payload);
    const envelopeErrors = await validate(envelope, { whitelist: true });
    if (envelopeErrors.length) throw new BadRequestException(flatten(envelopeErrors));

    try {
      if (!(DEPOSIT_EVENT_TYPES as readonly string[]).includes(envelope.type)) {
        const outcome = await this.ledger.acknowledgeUnhandled(envelope.id, envelope.type, payloadHash);
        return { received: true, eventId: envelope.id, outcome };
      }

      // Unknown extra fields are stripped (providers add fields over time) but never trusted.
      const event = plainToInstance(DepositEventDto, payload);
      const errors = await validate(event, { whitelist: true, forbidUnknownValues: true });
      if (errors.length) throw new BadRequestException(flatten(errors));

      const outcome = await this.ledger.processDepositEvent(event, payloadHash);
      return { received: true, eventId: event.id, outcome };
    } catch (err) {
      if (err instanceof RetryableLedgerError) {
        this.logger.warn(`Webhook ${envelope.id} deferred: ${err.message}`);
        throw new ServiceUnavailableException('Temporarily unable to process; retry later');
      }
      throw err;
    }
  }
}
