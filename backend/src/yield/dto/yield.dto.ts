import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AssetType, YieldInterval } from '../../generated/prisma/client.js';

const upper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateYieldRateDto {
  /** Annual percentage yield, e.g. 5.25 for 5.25% APY. */
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 }, {
    message: 'apyPercent must be a number with at most 4 decimal places',
  })
  @Min(0)
  @Max(1000)
  apyPercent!: number;

  @Transform(upper)
  @IsEnum(YieldInterval, { message: 'interval must be HOURLY or DAILY' })
  interval!: YieldInterval;

  @IsOptional()
  @IsBoolean()
  isActive = true;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}

export class YieldAssetParamDto {
  @Transform(upper)
  @IsEnum(AssetType, { message: `asset must be one of: ${Object.values(AssetType).join(', ')}` })
  asset!: AssetType;
}

export class TriggerRunDto {
  @Transform(upper)
  @IsEnum(YieldInterval, { message: 'interval must be HOURLY or DAILY' })
  interval!: YieldInterval;
}

export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;

  @IsOptional()
  @Transform(upper)
  @IsEnum(AssetType)
  asset?: AssetType;
}
