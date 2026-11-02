import {
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SIGNATURE_HEADER, verifyWebhookSignature, WebhookSignatureError } from './webhook-signature.js';

/** Rejects any webhook whose raw body is not signed with a configured secret. */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private readonly secrets: string[];
  private readonly tolerance: number;

  constructor(config: ConfigService) {
    this.secrets = config
      .getOrThrow<string>('WEBHOOK_SIGNING_SECRETS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.tolerance = config.get<number>('WEBHOOK_TOLERANCE_SECONDS') ?? 300;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    try {
      verifyWebhookSignature({
        rawBody: req.rawBody,
        header: req.header(SIGNATURE_HEADER),
        secrets: this.secrets,
        toleranceSeconds: this.tolerance,
      });
      return true;
    } catch (err) {
      const reason = err instanceof WebhookSignatureError ? err.reason : 'verification_error';
      this.logger.warn(`Rejected webhook from ${req.ip}: ${reason}`);
      // Deliberately generic: don't tell an attacker which check failed.
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
