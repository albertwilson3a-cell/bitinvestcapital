import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { AssetType, WithdrawalStatus } from '../generated/prisma/client.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class CreateWithdrawalDto {
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
  @MinLength(14)
  @MaxLength(128)
  address!: string;
}

export class ConfirmWithdrawalDto {
  @IsUUID()
  challengeId!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @Matches(/^\d{6}$/, { message: 'code must be the 6 digits from the email' })
  code!: string;
}

export class ResendWithdrawalCodeDto {
  @IsUUID()
  challengeId!: string;
}

export class WithdrawalIdDto {
  @IsUUID()
  id!: string;
}

export class AdminWithdrawalQueryDto {
  @IsOptional()
  @Transform(upper)
  @IsEnum({ ...WithdrawalStatus, ALL: 'ALL' }, { message: 'status is not recognised' })
  status?: WithdrawalStatus | 'ALL';
}

export class ApproveWithdrawalDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CompleteWithdrawalDto {
  @Transform(trim)
  @IsString()
  @MaxLength(128)
  txHash!: string;
}

export class RejectWithdrawalDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'reason must explain why the withdrawal is rejected' })
  @MaxLength(500)
  reason!: string;
}

export class AssetParamDto {
  @Transform(upper)
  @IsEnum(AssetType)
  asset!: AssetType;
}

export class UpdateWithdrawalSettingDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'fee must be a number (0 or more)' })
  fee!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'minAmount must be a number (0 or more)' })
  minAmount!: string;

  @IsBoolean()
  enabled!: boolean;
}
