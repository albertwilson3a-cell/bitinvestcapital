import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BRAND } from './config/brand.js';
import { buildCorsOptions } from './config/cors.js';

/** Shared by main.ts and the e2e tests so both run identical request handling. */
export function configureApp(app: INestApplication): void {
  // The webhook URL is registered with the provider, so it stays un-prefixed.
  app.setGlobalPrefix('api', { exclude: ['health', 'payments/webhook'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  app.enableCors(
    buildCorsOptions(
      config.get<string>('CORS_ROOT_DOMAIN') ?? BRAND.domain,
      (config.get<string>('CORS_EXTRA_ORIGINS') ?? '').split(','),
    ),
  );
}
