import { Injectable } from '@nestjs/common';
import {
  AssetType,
  BlockchainNetwork,
  Prisma,
  type DepositAddress,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_NETWORK } from './chains.js';
import { HdDerivationService } from './hd-derivation.service.js';

/** Raw-SQL values of the blockchain_network enum (Prisma @map targets). */
const NETWORK_DB_VALUE: Record<BlockchainNetwork, string> = {
  [BlockchainNetwork.ETHEREUM]: 'ethereum',
  [BlockchainNetwork.BITCOIN]: 'bitcoin',
};

@Injectable()
export class DepositAddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hd: HdDerivationService,
  ) {}

  /**
   * Returns the user's dedicated address for an asset, deriving it on first use.
   * Index allocation, derivation and insert happen in one transaction: the counter
   * row stays locked until commit, and a lost race rolls the increment back, so
   * no index is skipped or shared.
   */
  async getOrCreate(userId: string, assetType: AssetType): Promise<DepositAddress> {
    const existing = await this.prisma.depositAddress.findUnique({
      where: { userId_assetType: { userId, assetType } },
    });
    if (existing) return existing;

    const network = ASSET_NETWORK[assetType];
    try {
      return await this.prisma.$transaction(async (tx) => {
        const index = await this.allocateIndex(tx, network);
        const derived = this.hd.derive(network, index);
        return tx.depositAddress.create({
          data: {
            userId,
            assetType,
            network,
            address: derived.address,
            derivationIndex: index,
            derivationPath: derived.path,
          },
        });
      });
    } catch (err) {
      // A concurrent request created it first: return the winner's row.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.prisma.depositAddress.findUniqueOrThrow({
          where: { userId_assetType: { userId, assetType } },
        });
      }
      throw err;
    }
  }

  async getAllForUser(userId: string): Promise<DepositAddress[]> {
    return Promise.all(Object.values(AssetType).map((asset) => this.getOrCreate(userId, asset)));
  }

  private async allocateIndex(tx: Prisma.TransactionClient, network: BlockchainNetwork): Promise<number> {
    const rows = await tx.$queryRaw<{ index: number }[]>`
      INSERT INTO "hd_derivation_counters" ("network", "next_index", "updated_at")
      VALUES (${NETWORK_DB_VALUE[network]}::text::"blockchain_network", 1, now())
      ON CONFLICT ("network") DO UPDATE
        SET "next_index" = "hd_derivation_counters"."next_index" + 1, "updated_at" = now()
      RETURNING ("next_index" - 1) AS "index"`;
    return Number(rows[0].index);
  }
}
