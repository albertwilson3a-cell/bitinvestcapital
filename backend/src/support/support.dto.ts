import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SendMessageDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(2000, { message: 'Message must be 2,000 characters or fewer' })
  body!: string;
}

export class AfterQueryDto {
  /** Only messages newer than this timestamp (for polling). */
  @IsOptional()
  @IsISO8601()
  after?: string;
}

export class ConversationIdParamDto {
  @IsUUID()
  id!: string;
}

export class ListConversationsQueryDto {
  @IsOptional()
  @IsEnum(['open', 'closed', 'all'] as const, { message: 'status must be open, closed or all' })
  status?: 'open' | 'closed' | 'all';
}

export class UpdateConversationDto {
  @IsEnum(['open', 'closed'] as const, { message: 'status must be open or closed' })
  status!: 'open' | 'closed';
}
