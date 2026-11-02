import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditEntry {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

/** Append-only log of admin actions (UPDATE is blocked by a database trigger). */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AdminAudit');

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<void> {
    await client.adminAuditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        details: entry.details as Prisma.InputJsonValue | undefined,
        ip: entry.ip?.slice(0, 64),
      },
    });
    this.logger.log(`${entry.action} by ${entry.actorId}${entry.targetId ? ` on ${entry.targetType}:${entry.targetId}` : ''}`);
  }

  list(limit: number, cursor?: string) {
    return this.prisma.adminAuditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { actor: { select: { id: true, email: true } } },
    });
  }
}
