import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailProvider } from '../config/env.validation.js';
import { MailService } from './mail.service.js';
import { MAIL_TRANSPORT, type MailTransport } from './mail.types.js';
import { LogTransport } from './transports/log.transport.js';
import { SendGridTransport } from './transports/sendgrid.transport.js';
import { SesTransport } from './transports/ses.transport.js';
import { SmtpTransport } from './transports/smtp.transport.js';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailTransport => {
        switch (config.get<MailProvider>('MAIL_PROVIDER')) {
          case MailProvider.SendGrid:
            return new SendGridTransport(config.getOrThrow<string>('SENDGRID_API_KEY'));
          case MailProvider.Ses:
            return new SesTransport(
              config.getOrThrow<string>('AWS_REGION'),
              config.get<string>('SES_CONFIGURATION_SET'),
            );
          case MailProvider.Smtp:
            return new SmtpTransport({
              host: config.getOrThrow<string>('SMTP_HOST'),
              port: config.get<number>('SMTP_PORT') ?? 587,
              secure: config.get<boolean>('SMTP_SECURE') ?? false,
              user: config.get<string>('SMTP_USER') || undefined,
              password: config.get<string>('SMTP_PASSWORD') || undefined,
            });
          default:
            return new LogTransport();
        }
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
