import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AllocationItemDto } from './dto/allocation.dto.js';

const allocationSelect = {
  assetType: true,
  allocationPercentage: true,
  activeStatus: true,
  updatedAt: true,
} satisfies Prisma.DynamicAllocationSelect;

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllocations(userId: string) {
    const rows = await this.prisma.dynamicAllocation.findMany({
      where: { userId, activeStatus: true },
      select: allocationSelect,
      orderBy: { assetType: 'asc' },
    });
    return {
      allocations: rows.map((r) => ({ asset: r.assetType, percentage: r.allocationPercentage, updatedAt: r.updatedAt })),
      earningAssets: rows.map((r) => r.assetType),
    };
  }

  /**
   * Replaces the user's allocation atomically: listed assets become active with
   * their new weight; any asset left out is deactivated (and stops earning yield).
   */
  async setAllocations(userId: string, items: AllocationItemDto[]) {
    const assets = items.map((i) => i.asset);
    await this.prisma.$transaction(async (tx) => {
      await tx.dynamicAllocation.updateMany({
        where: { userId, assetType: { notIn: assets }, activeStatus: true },
        data: { activeStatus: false },
      });
      for (const item of items) {
        const pct = new Prisma.Decimal(item.percentage.toFixed(2));
        await tx.dynamicAllocation.upsert({
          where: { userId_assetType: { userId, assetType: item.asset } },
          create: { userId, assetType: item.asset, allocationPercentage: pct, activeStatus: true },
          update: { allocationPercentage: pct, activeStatus: true },
        });
      }
    });
    return this.getAllocations(userId);
  }
}
