import { plainToInstance, Transform, Type } from 'class-transformer';
import { BRAND } from './brand.js';
import { BlockchainNetwork } from '../generated/prisma/client.js';
import { networksNeedingXpub, readFixedAddresses } from '../wallets/fixed-addresses.js';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MaxLength,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum MailProvider {
  SendGrid = 'sendgrid',
  Ses = 'ses',
  Smtp = 'smtp',
  Log = 'log',
}

export enum BitcoinNetworkName {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  APP_NAME: string = BRAND.name;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Domain & CORS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /** Browsers on https://<this domain> and https://*.<this domain> may call the API. */
  @IsString()
  @Matches(/^([a-z0-9-]+\.)+[a-z]{2,}$/, { message: 'CORS_ROOT_DOMAIN must be a bare domain like bitinvestcapital.com' })
  CORS_ROOT_DOMAIN: string = BRAND.domain;

  /** Extra exact origins, comma-separated (e.g. http://localhost:5173 in development). */
  @IsOptional()
  @IsString()
  CORS_EXTRA_ORIGINS?: string;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Database / cache Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @IsString()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must be a PostgreSQL connection string' })
  DATABASE_URL!: string;

  @IsString()
  @Matches(/^[^,:\s]+:\d+(,[^,:\s]+:\d+)*$/, {
    message: 'REDIS_CLUSTER_NODES must be a comma-separated list of host:port',
  })
  REDIS_CLUSTER_NODES!: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  REDIS_NAT_MAP?: string;

  @IsOptional()
  @IsString()
  REDIS_KEY_PREFIX?: string;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Auth Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  /** Lifetime of access tokens, in seconds. */
  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS = 3600;

  /** `iss` claim: who issued the token. Checked on every request. */
  @IsUrl({ require_tld: false, require_protocol: true })
  JWT_ISSUER: string = BRAND.websiteUrl;

  /** `aud` claim: which application the token is for. Checked on every request. */
  @IsUrl({ require_tld: false, require_protocol: true })
  JWT_AUDIENCE: string = BRAND.websiteUrl;

  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS = 12;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(10080)
  VERIFICATION_TOKEN_TTL_MINUTES = 1440;

  /** Minimum seconds between verification-email resends per address. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

  @IsUrl({ require_tld: false, require_protocol: true })
  FRONTEND_URL!: string;

  /** Lifetime of emailed sign-in and withdrawal codes. */
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(30)
  LOGIN_CODE_TTL_MINUTES: number = 10;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Mail Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @IsEnum(MailProvider)
  MAIL_PROVIDER: MailProvider = MailProvider.Log;

  @IsEmail()
  MAIL_FROM_ADDRESS!: string;

  @IsString()
  MAIL_FROM_NAME: string = BRAND.name;

  /** Shown as the help contact in emails; defaults to MAIL_FROM_ADDRESS. */
  @IsEmail()
  MAIL_SUPPORT_ADDRESS: string = BRAND.supportEmail;

  /** Public website linked from every email footer. */
  @IsUrl({ require_tld: false, require_protocol: true })
  MAIL_WEBSITE_URL: string = BRAND.websiteUrl;

  /** Registered company address for email footers; omitted when empty. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  MAIL_POSTAL_ADDRESS?: string;

  @ValidateIf((o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.SendGrid)
  @IsString()
  @MinLength(1, { message: 'SENDGRID_API_KEY is required when MAIL_PROVIDER=sendgrid' })
  SENDGRID_API_KEY?: string;

  @ValidateIf((o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.Ses)
  @IsString()
  @MinLength(1, { message: 'AWS_REGION is required when MAIL_PROVIDER=ses' })
  AWS_REGION?: string;

  @IsOptional()
  @IsString()
  SES_CONFIGURATION_SET?: string;

  @ValidateIf((o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.Smtp)
  @IsString()
  @MinLength(1, { message: 'SMTP_HOST is required when MAIL_PROVIDER=smtp' })
  SMTP_HOST?: string;

  /** 587 (STARTTLS, most providers) or 465 (TLS). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 587;

  /** true for port 465; false for 587 (the connection is still upgraded to TLS). */
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.SMTP_SECURE === true || obj.SMTP_SECURE === 'true')
  @IsBoolean()
  SMTP_SECURE: boolean = false;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  // Ã¢â€â‚¬Ã¢â€â‚¬ HD wallets (watch-only: extended PUBLIC keys only) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /** Account-level xpub, e.g. m/44'/60'/0'. Used for ETH and USDT (ERC-20). */
  @IsOptional()
  @IsString()
  @Matches(/^xpub[1-9A-HJ-NP-Za-km-z]{100,112}$/, { message: 'ETH_ACCOUNT_XPUB must be an xpub (never an xprv)' })
  ETH_ACCOUNT_XPUB?: string;

  @IsString()
  ETH_ACCOUNT_PATH = "m/44'/60'/0'";

  /** Account-level xpub/zpub (mainnet) or tpub/vpub (testnet), e.g. m/84'/0'/0'. */
  @IsOptional()
  @IsString()
  @Matches(/^[xztv]pub[1-9A-HJ-NP-Za-km-z]{100,112}$/, {
    message: 'BTC_ACCOUNT_XPUB must be an xpub/zpub/tpub/vpub (never a private key)',
  })
  BTC_ACCOUNT_XPUB?: string;

  @IsString()
  BTC_ACCOUNT_PATH = "m/84'/0'/0'";

  // Ã¢â€â‚¬Ã¢â€â‚¬ Shared deposit addresses (optional) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // When set, every client is shown this one address for the asset and reports
  // the transaction hash after sending; staff confirm before crediting.
  // Leave empty to give each client their own address derived from the xpub.
  @IsOptional()
  @IsString()
  @MaxLength(128)
  DEPOSIT_ADDRESS_BTC?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  DEPOSIT_ADDRESS_ETH?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  DEPOSIT_ADDRESS_USDT?: string;

  /** Public JSON-RPC endpoint used to look up reported Ethereum transactions for reviewers. */
  @IsOptional()
  @IsString()
  ETH_RPC_URL?: string;

  /** Esplora API (mempool.space / blockstream) used to look up reported Bitcoin transactions. */
  @IsOptional()
  @IsString()
  BTC_ESPLORA_URL?: string;

  @IsEnum(BitcoinNetworkName)
  BTC_NETWORK: BitcoinNetworkName = BitcoinNetworkName.Mainnet;

  /** Official USDT ERC-20 contract; transfers from any other contract are rejected. */
  @IsString()
  @Matches(/^0x[0-9a-fA-F]{40}$/)
  USDT_CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

  // Ã¢â€â‚¬Ã¢â€â‚¬ Payment webhooks Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  /** Comma-separated; first is current, the rest are accepted during rotation. Each Ã¢â€°Â¥ 32 chars. */
  @IsString()
  @Matches(/^[^,\s]{32,}(,[^,\s]{32,})*$/, {
    message: 'WEBHOOK_SIGNING_SECRETS must be comma-separated secrets of at least 32 characters',
  })
  WEBHOOK_SIGNING_SECRETS!: string;

  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3600)
  WEBHOOK_TOLERANCE_SECONDS = 300;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  MIN_CONFIRMATIONS_BTC = 3;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  MIN_CONFIRMATIONS_ETH = 12;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  MIN_CONFIRMATIONS_USDT = 12;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Referral rewards & pricing Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @IsString()
  @Matches(/^0(\.\d{1,6})?$/, { message: 'REFERRAL_REWARD_RATE must be a decimal fraction like 0.01' })
  REFERRAL_REWARD_RATE = '0.01';

  /** coingecko (real) or simulated (dev-only random walk; refused in production). */
  @IsIn(['coingecko', 'simulated'])
  PRICE_PROVIDER = 'coingecko';

  @IsUrl({ require_tld: false, require_protocol: true })
  PRICE_API_URL = 'https://api.coingecko.com/api/v3';

  @IsOptional()
  @IsString()
  PRICE_API_KEY?: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(600)
  PRICE_CACHE_SECONDS = 60;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Yield engine Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  @IsIn(['true', 'false'])
  YIELD_SCHEDULER_ENABLED = 'true';

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(10000)
  YIELD_BATCH_SIZE = 500;

  /** Share of a referee's yield paid to their direct referrer (0.05 = 5%). */
  @IsString()
  @Matches(/^0(\.\d{1,6})?$/, { message: 'AFFILIATE_YIELD_REWARD_RATE must be a decimal fraction like 0.05' })
  AFFILIATE_YIELD_REWARD_RATE = '0.05';

  /** Ceiling enforced on admin APY changes (fat-finger guard). */
  @IsString()
  @Matches(/^\d+(?:\.\d{1,4})?$/, {
    message: 'YIELD_MAX_APY_PERCENT must be a non-negative decimal string with at most 4 decimal places',
  })
  YIELD_MAX_APY_PERCENT = '100';

  /** A RUNNING run older than this is considered crashed and may be resumed. */
  @Type(() => Number)
  @IsInt()
  @Min(5)
  YIELD_STALE_RUN_MINUTES = 60;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  if (validated.NODE_ENV === NodeEnv.Production) {
    const insecure = (validated.CORS_EXTRA_ORIGINS ?? '').split(',').map((o) => o.trim()).filter((o) => o && !o.startsWith('https://'));
    if (insecure.length) {
      throw new Error(`Invalid environment configuration:\nCORS_EXTRA_ORIGINS must be https in production (got ${insecure.join(', ')})`);
    }
  }
  if (validated.NODE_ENV === NodeEnv.Production && validated.PRICE_PROVIDER === 'simulated') {
    throw new Error('Invalid environment configuration:\nPRICE_PROVIDER=simulated is not allowed in production');
  }
  if (validated.NODE_ENV === NodeEnv.Production && validated.MAIL_PROVIDER === MailProvider.Log) {
    throw new Error('Invalid environment configuration:\nMAIL_PROVIDER=log is not allowed in production');
  }
  try {
    // Shape check of shared addresses, and an xpub for every network still deriving addresses.
    const get = <T>(k: string) => (validated as unknown as Record<string, T>)[k];
    const fixed = readFixedAddresses({ get });
    const needed = networksNeedingXpub(fixed);
    if (needed.has(BlockchainNetwork.ETHEREUM) && !validated.ETH_ACCOUNT_XPUB) {
      throw new Error('ETH_ACCOUNT_XPUB is required unless DEPOSIT_ADDRESS_ETH and DEPOSIT_ADDRESS_USDT are both set');
    }
    if (needed.has(BlockchainNetwork.BITCOIN) && !validated.BTC_ACCOUNT_XPUB) {
      throw new Error('BTC_ACCOUNT_XPUB is required unless DEPOSIT_ADDRESS_BTC is set');
    }
  } catch (err) {
    throw new Error(`Invalid environment configuration:\n${err instanceof Error ? err.message : String(err)}`);
  }
  return validated;
}
