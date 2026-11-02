import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { AssetType } from '../../generated/prisma/client.js';

/** Percentages carry at most 2 decimals, so basis points (×100) are exact integers. */
export function toBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

function isWellFormed(item: unknown): item is { asset: string; percentage: number } {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as { percentage?: unknown }).percentage === 'number' &&
    Number.isFinite((item as { percentage: number }).percentage) &&
    typeof (item as { asset?: unknown }).asset === 'string'
  );
}

/**
 * The allocation must total exactly 100%. Summing integer basis points avoids
 * float error (33.33 + 33.33 + 33.34 is 99.99999999999999 as IEEE doubles).
 */
@ValidatorConstraint({ name: 'allocationSumEquals100', async: false })
export class AllocationSumConstraint implements ValidatorConstraintInterface {
  validate(items: unknown): boolean {
    if (!Array.isArray(items) || items.length === 0) return true; // reported by @IsArray / @ArrayMinSize
    if (!items.every(isWellFormed)) return true; // per-item errors are reported on the items
    return items.reduce((sum, i) => sum + toBasisPoints(i.percentage), 0) === 10_000;
  }

  defaultMessage(args: ValidationArguments): string {
    const items = (args.value as unknown[]).filter(isWellFormed);
    const total = items.reduce((sum, i) => sum + toBasisPoints(i.percentage), 0) / 100;
    return `allocation percentages must sum to exactly 100 (received ${total})`;
  }
}

@ValidatorConstraint({ name: 'uniqueAllocationAssets', async: false })
export class UniqueAssetsConstraint implements ValidatorConstraintInterface {
  validate(items: unknown): boolean {
    if (!Array.isArray(items) || !items.every(isWellFormed)) return true;
    const assets = items.map((i) => i.asset);
    return new Set(assets).size === assets.length;
  }

  defaultMessage(): string {
    return 'each asset may appear only once in an allocation';
  }
}

const upper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class AllocationItemDto {
  @Transform(upper)
  @IsEnum(AssetType, { message: `asset must be one of: ${Object.values(AssetType).join(', ')}` })
  asset!: AssetType;

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'percentage must be a number with at most 2 decimal places' },
  )
  @Min(0.01, { message: 'percentage must be greater than 0' })
  @Max(100, { message: 'percentage cannot exceed 100' })
  percentage!: number;
}

export class SetAllocationsDto {
  @IsArray({ message: 'allocations must be an array' })
  @ArrayMinSize(1, { message: 'allocations must contain at least one asset' })
  @ArrayMaxSize(Object.values(AssetType).length)
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  @Validate(UniqueAssetsConstraint)
  @Validate(AllocationSumConstraint)
  allocations!: AllocationItemDto[];
}
