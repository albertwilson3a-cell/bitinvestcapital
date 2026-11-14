import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Keeps req.rawBody so webhook signatures are verified over the exact bytes received.
    rawBody: true,
  });
  configureApp(app);

  const configuredPort = app.get(ConfigService).get<string>('PORT');
  const port = configuredPort ? Number(configuredPort) : 3000;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT configuration: ${configuredPort}`);
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(`Server listening on port ${port}`, 'Bootstrap');
}

await bootstrap();
