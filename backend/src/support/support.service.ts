import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { SupportConversationStatus, type Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Messages a client may send per minute, to stop accidental floods and abuse. */
export const CLIENT_MESSAGES_PER_MINUTE = 20;
const PAGE = 200;

export interface MessageView {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: Date;
}

const messageSelect = { id: true, body: true, fromStaff: true, createdAt: true } satisfies Prisma.SupportMessageSelect;

/**
 * One conversation per client. Clients only ever see their own thread; staff
 * see every thread through the admin endpoints. Unread state is tracked with
 * a "last read" timestamp per side.
 */
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── client side ──────────────────────────────────────────────────

  async clientThread(userId: string, after?: Date) {
    const conversation = await this.prisma.supportConversation.findUnique({ where: { userId } });
    if (!conversation) return { conversation: null, messages: [] as MessageView[], unread: 0 };
    const [messages, unread] = await Promise.all([
      this.messages(conversation.id, after),
      this.prisma.supportMessage.count({
        where: { conversationId: conversation.id, fromStaff: true, ...(conversation.clientLastReadAt ? { createdAt: { gt: conversation.clientLastReadAt } } : {}) },
      }),
    ]);
    return { conversation: this.view(conversation), messages, unread };
  }

  async clientSend(userId: string, body: string): Promise<MessageView> {
    const since = new Date(Date.now() - 60_000);
    const recent = await this.prisma.supportMessage.count({ where: { senderId: userId, createdAt: { gt: since } } });
    if (recent >= CLIENT_MESSAGES_PER_MINUTE) {
      throw new HttpException('You are sending messages too quickly. Please wait a moment.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const conversation = await tx.supportConversation.upsert({
        where: { userId },
        create: { userId, lastMessageAt: now, clientLastReadAt: now },
        update: { status: SupportConversationStatus.OPEN, lastMessageAt: now, clientLastReadAt: now },
      });
      return tx.supportMessage.create({
        data: { conversationId: conversation.id, senderId: userId, fromStaff: false, body, createdAt: now },
        select: messageSelect,
      });
    });
  }

  async clientMarkRead(userId: string) {
    await this.prisma.supportConversation.updateMany({ where: { userId }, data: { clientLastReadAt: new Date() } });
  }

  // ── staff side ───────────────────────────────────────────────────

  async listConversations(status: 'open' | 'closed' | 'all' = 'open') {
    const rows = await this.prisma.supportConversation.findMany({
      where: status === 'all' ? {} : { status: status === 'open' ? SupportConversationStatus.OPEN : SupportConversationStatus.CLOSED },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: messageSelect },
      },
    });
    const unread = await Promise.all(
      rows.map((c) =>
        this.prisma.supportMessage.count({
          where: { conversationId: c.id, fromStaff: false, ...(c.staffLastReadAt ? { createdAt: { gt: c.staffLastReadAt } } : {}) },
        }),
      ),
    );
    return rows.map((c, i) => ({ ...this.view(c), client: c.user, lastMessage: c.messages[0] ?? null, unread: unread[i] }));
  }

  /** Conversations with at least one client message the staff haven't read. */
  async staffUnreadCount(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT c.id) AS n
      FROM support_conversations c
      JOIN support_messages m ON m.conversation_id = c.id AND m.from_staff = false
      WHERE c.staff_last_read_at IS NULL OR m.created_at > c.staff_last_read_at`;
    return Number(rows[0]?.n ?? 0);
  }

  async staffThread(conversationId: string, after?: Date) {
    const c = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: { user: { select: { id: true, email: true, createdAt: true, isVerified: true } } },
    });
    if (!c) throw new NotFoundException('Conversation not found');
    return { conversation: { ...this.view(c), client: c.user }, messages: await this.messages(c.id, after) };
  }

  async staffReply(conversationId: string, staffId: string, body: string): Promise<MessageView> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.supportConversation.updateMany({
        where: { id: conversationId },
        data: { status: SupportConversationStatus.OPEN, lastMessageAt: now, staffLastReadAt: now },
      });
      if (!updated.count) throw new NotFoundException('Conversation not found');
      return tx.supportMessage.create({
        data: { conversationId, senderId: staffId, fromStaff: true, body, createdAt: now },
        select: messageSelect,
      });
    });
  }

  async staffMarkRead(conversationId: string) {
    const r = await this.prisma.supportConversation.updateMany({ where: { id: conversationId }, data: { staffLastReadAt: new Date() } });
    if (!r.count) throw new NotFoundException('Conversation not found');
  }

  async setStatus(conversationId: string, status: 'open' | 'closed') {
    const r = await this.prisma.supportConversation.updateMany({
      where: { id: conversationId },
      data: { status: status === 'open' ? SupportConversationStatus.OPEN : SupportConversationStatus.CLOSED },
    });
    if (!r.count) throw new NotFoundException('Conversation not found');
  }

  // ── helpers ──────────────────────────────────────────────────────

  private messages(conversationId: string, after?: Date): Promise<MessageView[]> {
    if (after) {
      return this.prisma.supportMessage.findMany({
        where: { conversationId, createdAt: { gt: after } },
        orderBy: { createdAt: 'asc' },
        take: PAGE,
        select: messageSelect,
      });
    }
    // Latest page, returned oldest first.
    return this.prisma.supportMessage
      .findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: PAGE, select: messageSelect })
      .then((rows) => rows.reverse());
  }

  private view(c: { id: string; status: SupportConversationStatus; lastMessageAt: Date; createdAt: Date }) {
    return { id: c.id, status: c.status === SupportConversationStatus.OPEN ? 'open' : 'closed', lastMessageAt: c.lastMessageAt, createdAt: c.createdAt };
  }
}
