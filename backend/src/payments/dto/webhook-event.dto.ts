import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssetType } from '../../generated/prisma/client.js';

export const DEPOSIT_EVENT_TYPES = ['deposit.pending', 'deposit.confirmed'] as const;
export type DepositEventType = (typeof DEPOSIT_EVENT_TYPES)[number];

/** Envelope: any event type is accepted (and acknowledged) so providers don't retry forever. */
export class WebhookEnvelopeDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_\-:.]{8,128}$/, { message: 'id must be 8-128 chars of [A-Za-z0-9_-:.]' })
  id!: string;

  @IsString()
  @MaxLength(64)
  type!: string;

  @IsISO8601()
  createdAt!: string;
}

export class DepositEventDataDto {
  @IsIn(['ethereum', 'bitcoin'])
  network!: 'ethereum' | 'bitcoin';

  @IsEnum(AssetType)
  asset!: AssetType;

  /** 0x-prefixed for Ethereum, bare hex for Bitcoin — checked per network in the ledger. */
  @IsString()
  @Matches(/^(0x)?[0-9a-fA-F]{64}$/)
  txHash!: string;

  /** ERC-20 log index or BTC vout. */
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  outputIndex!: number;

  @IsString()
  @MaxLength(128)
  toAddress!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  fromAddress?: string;

  /** Decimal string in whole units (e.g. "0.015" BTC). Never a float. */
  @IsString()
  @Matches(/^(0|[1-9]\d{0,17})(\.\d{1,18})?$/, { message: 'amount must be a positive decimal string' })
  amount!: string;

  @IsInt()
  @Min(0)
  @Max(10_000_000)
  confirmations!: number;

  @IsInt()
  @Min(0)
  blockNumber!: number;

  @IsOptional()
  @IsString()
  @Matches(/^(0x)?[0-9a-fA-F]{64}$/)
  blockHash?: string;

  /** Required for USDT; must equal USDT_CONTRACT_ADDRESS. */
  @IsOptional()
  @IsString()
  @Matches(/^0x[0-9a-fA-F]{40}$/)
  contractAddress?: string;
}

export class DepositEventDto extends WebhookEnvelopeDto {
  @IsIn(DEPOSIT_EVENT_TYPES)
  declare type: DepositEventType;

  @ValidateNested()
  @Type(() => DepositEventDataDto)
  data!: DepositEventDataDto;
}
