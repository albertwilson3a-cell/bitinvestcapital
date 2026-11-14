import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AssetType, YieldInterval } from '../../generated/prisma/client.js';

const upper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateYieldRateDto {
  /** Return per week, e.g. 0.18 for 0.18% a week. Preferred; give this or apyPercent. */
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 }, {
    message: 'weeklyPercent must be a number with at most 6 decimal places',
  })
  @Min(0)
  @Max(121.069630, { message: 'highest rate allowed is 121.0696% a week' })
  weeklyPercent?: number;

  /** Annual percentage yield, e.g. "5.25" for 5.25% APY. */
  @IsOptional()
  @IsString()
  @MaxLength(31)
  @Matches(/^\d+(?:\.\d{1,4})?$/, {
    message: 'apyPercent must be a non-negative decimal string with at most 4 decimal places',
  })
  apyPercent?: string;

  @Transform(upper)
  @IsOptional()
  @IsEnum(YieldInterval, { message: 'interval must be HOURLY or DAILY' })
  interval: YieldInterval = YieldInterval.DAILY;

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
