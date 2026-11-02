-- AlterEnum
ALTER TYPE "transaction_type" ADD VALUE 'affiliate_yield_reward';

-- CreateEnum
CREATE TYPE "yield_interval" AS ENUM ('hourly', 'daily');

-- CreateEnum
CREATE TYPE "yield_run_status" AS ENUM ('running', 'completed', 'failed');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "yield_run_id" UUID;

-- CreateTable
CREATE TABLE "yield_rates" (
    "id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "apy_percent" DECIMAL(9,4) NOT NULL,
    "interval" "yield_interval" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "note" VARCHAR(280),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yield_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_runs" (
    "id" UUID NOT NULL,
    "interval" "yield_interval" NOT NULL,
    "period_key" VARCHAR(40) NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "status" "yield_run_status" NOT NULL,
    "trigger" VARCHAR(16) NOT NULL,
    "rate_snapshot" JSONB NOT NULL,
    "holdings_scanned" INTEGER NOT NULL DEFAULT 0,
    "payouts_created" INTEGER NOT NULL DEFAULT 0,
    "affiliate_rewards" INTEGER NOT NULL DEFAULT 0,
    "totals" JSONB,
    "error" VARCHAR(1000),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "yield_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "yield_rates_asset_type_created_at_idx" ON "yield_rates"("asset_type", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "yield_runs_period_key_key" ON "yield_runs"("period_key");

-- CreateIndex
CREATE INDEX "yield_runs_status_started_at_idx" ON "yield_runs"("status", "started_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_asset_type_confirmed_at_idx" ON "transactions"("user_id", "asset_type", "confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_yield_run_id_user_id_asset_type_key" ON "transactions"("yield_run_id", "user_id", "asset_type");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_yield_run_id_fkey" FOREIGN KEY ("yield_run_id") REFERENCES "yield_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_rates" ADD CONSTRAINT "yield_rates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Guards not modelled by Prisma.
ALTER TABLE "yield_rates" ADD CONSTRAINT "yield_rates_apy_range_chk" CHECK ("apy_percent" >= 0 AND "apy_percent" <= 1000);
ALTER TABLE "dynamic_allocations" ADD CONSTRAINT "dynamic_allocations_pct_range_chk"
  CHECK ("allocation_percentage" > 0 AND "allocation_percentage" <= 100);
