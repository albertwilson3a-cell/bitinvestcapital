import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { AssetType, DepositClaimStatus } from '../generated/prisma/client.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const emptyToUndefined = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

export class CreateDepositClaimDto {
  @Transform(upper)
  @IsEnum(AssetType, { message: 'asset must be BTC, ETH or USDT' })
  asset!: AssetType;

  @Transform(trim)
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'amount must be a positive number' })
  @MaxLength(40)
  amount!: string;

  @Transform(trim)
  @IsString()
  @MinLength(64, { message: 'Enter the full transaction hash from your wallet' })
  @MaxLength(80)
  txHash!: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(128)
  fromAddress?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class DepositClaimIdDto {
  @IsUUID()
  id!: string;
}

export class AdminDepositClaimQueryDto {
  @IsOptional()
  @Transform(upper)
  @IsEnum({ ...DepositClaimStatus, ALL: 'ALL' }, { message: 'status is not recognised' })
  status?: DepositClaimStatus | 'ALL';
}

export class ApproveDepositClaimDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'amount must be the amount received, as a number' })
  @MaxLength(40)
  amount!: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectDepositClaimDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'reason must explain why the deposit is rejected' })
  @MaxLength(500)
  reason!: string;
}
