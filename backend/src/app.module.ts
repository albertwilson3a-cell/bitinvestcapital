import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { MailModule } from './mail/mail.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { MarketModule } from './market/market.module.js';
import { SupportModule } from './support/support.module.js';
import { WithdrawalsModule } from './withdrawals/withdrawals.module.js';
import { PortfolioModule } from './portfolio/portfolio.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { UsersModule } from './users/users.module.js';
import { WalletsModule } from './wallets/wallets.module.js';
import { YieldModule } from './yield/yield.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    SettingsModule,
    AuditModule,
    MailModule,
    UsersModule,
    AuthModule,
    WalletsModule,
    PaymentsModule,
    MarketModule,
    SupportModule,
    WithdrawalsModule,
    PortfolioModule,
    YieldModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
