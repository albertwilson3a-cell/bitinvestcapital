import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AdjustmentDirection, AdjustmentStatus, AssetType, UserRole } from '../../generated/prisma/client.js';

const upper = ({ value }: TransformFnParams): unknown => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const trim = ({ value }: TransformFnParams): unknown => (typeof value === 'string' ? value.trim() : value);

export class ListUsersQueryDto {
  /** Matches email (contains) or referral code (exact). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(320)
  q?: string;

  @IsOptional()
  @Transform(upper)
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsIn(['true', 'false'])
  verified?: 'true' | 'false';

  @IsOptional()
  @IsIn(['created_desc', 'created_asc', 'last_login_desc'])
  sort: 'created_desc' | 'created_asc' | 'last_login_desc' = 'created_desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsUUID('4')
  cursor?: string;
}

export class UserIdParamDto {
  @IsUUID('4')
  id!: string;
}

export class CreateAdjustmentDto {
  @Transform(upper)
  @IsEnum(AssetType)
  asset!: AssetType;

  @Transform(upper)
  @IsEnum(AdjustmentDirection, { message: 'direction must be CREDIT or DEBIT' })
  direction!: AdjustmentDirection;

  /** Decimal string in whole units, e.g. "125.50". */
  @IsString()
  @Matches(/^(0|[1-9]\d{0,17})(\.\d{1,18})?$/, { message: 'amount must be a positive decimal string' })
  amount!: string;

  @Transform(trim)
  @IsString()
  @MinLength(15, { message: 'reason must explain the adjustment (at least 15 characters)' })
  @MaxLength(500)
  reason!: string;

  /** Ticket or case number. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class DecideAdjustmentDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListAdjustmentsQueryDto {
  @IsOptional()
  @Transform(upper)
  @IsEnum(AdjustmentStatus)
  status?: AdjustmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^0(\.\d{1,6})?$/, { message: 'referralDepositRewardRate must be a fraction like 0.01' })
  referralDepositRewardRate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^0(\.\d{1,6})?$/, { message: 'affiliateYieldRewardRate must be a fraction like 0.05' })
  affiliateYieldRewardRate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,6}(\.\d{1,2})?$/, { message: 'minInvestmentUsd must be a dollar amount like 50' })
  minInvestmentUsd?: string;

  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'note must say why the change is being made' })
  @MaxLength(280)
  note!: string;
}

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 50;

  @IsOptional()
  @IsUUID('4')
  cursor?: string;
}

export class SuspendUserDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'reason must explain why the account is being suspended' })
  @MaxLength(500)
  reason!: string;
}
