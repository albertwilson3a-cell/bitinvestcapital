import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AssetType, TransactionType } from '../../generated/prisma/client.js';

const upper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class AssetParamDto {
  @Transform(upper)
  @IsEnum(AssetType, { message: `asset must be one of: ${Object.values(AssetType).join(', ')}` })
  asset!: AssetType;
}

export class ListTransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsUUID('4')
  cursor?: string;

  @IsOptional()
  @Transform(upper)
  @IsEnum(AssetType)
  asset?: AssetType;

  @IsOptional()
  @Transform(upper)
  @IsEnum(TransactionType)
  type?: TransactionType;
}
