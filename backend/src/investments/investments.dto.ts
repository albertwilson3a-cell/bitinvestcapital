import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AssetType } from '../generated/prisma/client.js';

const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AssetParamDto {
  @Transform(upper)
  @IsEnum(AssetType, { message: 'asset must be BTC, ETH or USDT' })
  asset!: AssetType;
}

export class InvestDto {
  @Transform(upper)
  @IsEnum(AssetType, { message: 'asset must be BTC, ETH or USDT' })
  asset!: AssetType;

  @Transform(trim)
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'amount must be a positive number' })
  @MaxLength(40)
  amount!: string;
}

export class RedeemDto {
  @Transform(upper)
  @IsEnum(AssetType, { message: 'asset must be BTC, ETH or USDT' })
  asset!: AssetType;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'amount must be a positive number' })
  @MaxLength(40)
  amount?: string;

  /** Move the whole investment back to the wallet. */
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
