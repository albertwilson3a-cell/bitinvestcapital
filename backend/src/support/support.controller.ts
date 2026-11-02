import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { UserRole } from '../generated/prisma/client.js';
import { AfterQueryDto, ConversationIdParamDto, ListConversationsQueryDto, SendMessageDto, UpdateConversationDto } from './support.dto.js';
import { SupportService } from './support.service.js';

const after = (q: AfterQueryDto) => (q.after ? new Date(q.after) : undefined);

/** Live chat for signed-in clients (global JWT guard applies). */
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('conversation')
  thread(@CurrentUser() user: AuthUser, @Query() q: AfterQueryDto) {
    return this.support.clientThread(user.id, after(q));
  }

  @Post('conversation/messages')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.support.clientSend(user.id, dto.body);
  }

  @Post('conversation/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async read(@CurrentUser() user: AuthUser) {
    await this.support.clientMarkRead(user.id);
  }
}

/** Support inbox for administrators. */
@Roles(UserRole.ADMIN)
@Controller('admin/support')
export class AdminSupportController {
  constructor(
    private readonly support: SupportService,
    private readonly audit: AuditService,
  ) {}

  @Get('conversations')
  list(@Query() q: ListConversationsQueryDto) {
    return this.support.listConversations(q.status ?? 'open');
  }

  @Get('unread')
  async unread() {
    return { conversations: await this.support.staffUnreadCount() };
  }

  @Get('conversations/:id')
  thread(@Param() p: ConversationIdParamDto, @Query() q: AfterQueryDto) {
    return this.support.staffThread(p.id, after(q));
  }

  @Post('conversations/:id/messages')
  reply(@Param() p: ConversationIdParamDto, @Body() dto: SendMessageDto, @CurrentUser() admin: AuthUser) {
    return this.support.staffReply(p.id, admin.id, dto.body);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async read(@Param() p: ConversationIdParamDto) {
    await this.support.staffMarkRead(p.id);
  }

  @Patch('conversations/:id')
  async setStatus(@Param() p: ConversationIdParamDto, @Body() dto: UpdateConversationDto, @CurrentUser() admin: AuthUser, @Ip() ip: string) {
    await this.support.setStatus(p.id, dto.status);
    await this.audit.record({
      actorId: admin.id,
      action: dto.status === 'closed' ? 'support.close' : 'support.reopen',
      targetType: 'support_conversation',
      targetId: p.id,
      ip,
    });
    return { id: p.id, status: dto.status };
  }
}
