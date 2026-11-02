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

  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(port);
  Logger.log(`Server listening on http://localhost:${port}`, 'Bootstrap');
}

await bootstrap();
