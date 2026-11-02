-- CreateEnum
CREATE TYPE "blockchain_network" AS ENUM ('ethereum', 'bitcoin');

-- CreateEnum
CREATE TYPE "webhook_event_status" AS ENUM ('processed', 'ignored');

-- DropIndex
DROP INDEX "transactions_blockchain_tx_hash_key";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "block_number" BIGINT,
ADD COLUMN     "confirmations" INTEGER,
ADD COLUMN     "confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "network" "blockchain_network",
ADD COLUMN     "output_index" INTEGER,
ADD COLUMN     "source_transaction_id" UUID;

-- CreateTable
CREATE TABLE "deposit_addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "network" "blockchain_network" NOT NULL,
    "address" VARCHAR(128) NOT NULL,
    "derivation_index" INTEGER NOT NULL,
    "derivation_path" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hd_derivation_counters" (
    "network" "blockchain_network" NOT NULL,
    "next_index" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hd_derivation_counters_pkey" PRIMARY KEY ("network")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" VARCHAR(128) NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "status" "webhook_event_status" NOT NULL,
    "reason" VARCHAR(255),
    "payload_hash" CHAR(64) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_address_key" ON "deposit_addresses"("address");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_user_id_asset_type_key" ON "deposit_addresses"("user_id", "asset_type");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_network_derivation_index_key" ON "deposit_addresses"("network", "derivation_index");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_source_transaction_id_key" ON "transactions"("source_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_network_blockchain_tx_hash_output_index_key" ON "transactions"("network", "blockchain_tx_hash", "output_index");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_transaction_id_fkey" FOREIGN KEY ("source_transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_addresses" ADD CONSTRAINT "deposit_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ledger safety nets (not modelled by Prisma; enforced by PostgreSQL).
ALTER TABLE "balances" ADD CONSTRAINT "balances_non_negative_chk"
  CHECK ("balance" >= 0 AND "locked_balance" >= 0 AND "flexible_yield_earned" >= 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive_chk" CHECK ("amount" > 0);
ALTER TABLE "deposit_addresses" ADD CONSTRAINT "deposit_addresses_index_range_chk"
  CHECK ("derivation_index" >= 0 AND "derivation_index" < 2147483648);
