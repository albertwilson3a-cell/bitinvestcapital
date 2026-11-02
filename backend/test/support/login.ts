import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * Completes the two-step sign-in in suites that don't capture email: starts
 * the login, sets a known code on the challenge (using the server's own HMAC
 * key), then verifies it. Returns the verify response (accessToken, user).
 */
export async function loginWithCode(app: INestApplication, email: string, password: string) {
  const http = () => request(app.getHttpServer());
  const start = await http().post('/api/auth/login').send({ email, password }).expect(200);
  if (start.body.status !== 'code_required') throw new Error('Expected a login code challenge');
  const id = start.body.challengeId as string;
  const code = '424242';
  const secret = app.get(ConfigService).getOrThrow<string>('JWT_SECRET');
  await app.get(PrismaService).authChallenge.update({
    where: { id },
    data: { codeHash: createHmac('sha256', secret).update(`${id}:${code}`).digest('hex') },
  });
  return http().post('/api/auth/login/verify').send({ challengeId: id, code }).expect(200);
}
