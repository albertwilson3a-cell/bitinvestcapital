-- AlterEnum
ALTER TYPE "transaction_type" ADD VALUE 'adjustment_credit';
ALTER TYPE "transaction_type" ADD VALUE 'adjustment_debit';

-- CreateEnum
CREATE TYPE "adjustment_direction" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "adjustment_status" AS ENUM ('pending_approval', 'applied', 'rejected');

-- AlterTable
ALTER TABLE "yield_runs" ADD COLUMN     "affiliate_rate" DECIMAL(9,6);

-- CreateTable
CREATE TABLE "balance_adjustments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "direction" "adjustment_direction" NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "reference" VARCHAR(120),
    "status" "adjustment_status" NOT NULL DEFAULT 'pending_approval',
    "requested_by_id" UUID NOT NULL,
    "decided_by_id" UUID,
    "decision_note" VARCHAR(500),
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(6),

    CONSTRAINT "balance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" VARCHAR(64) NOT NULL,
    "value" VARCHAR(64) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "platform_setting_changes" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "old_value" VARCHAR(64),
    "new_value" VARCHAR(64) NOT NULL,
    "note" VARCHAR(280),
    "changed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_setting_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "target_type" VARCHAR(32),
    "target_id" VARCHAR(64),
    "details" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "balance_adjustments_transaction_id_key" ON "balance_adjustments"("transaction_id");

-- CreateIndex
CREATE INDEX "balance_adjustments_status_created_at_idx" ON "balance_adjustments"("status", "created_at");

-- CreateIndex
CREATE INDEX "balance_adjustments_user_id_created_at_idx" ON "balance_adjustments"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_setting_changes_key_created_at_idx" ON "platform_setting_changes"("key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_log_actor_id_created_at_idx" ON "admin_audit_log"("actor_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_setting_changes" ADD CONSTRAINT "platform_setting_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Guards not modelled by Prisma.
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_amount_positive_chk" CHECK ("amount" > 0);
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_four_eyes_chk"
  CHECK ("decided_by_id" IS NULL OR "decided_by_id" <> "requested_by_id" OR "status" = 'rejected');
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_not_self_chk" CHECK ("requested_by_id" <> "user_id");

-- Audit entries can be added and (for retention) removed, but never rewritten.
CREATE FUNCTION "admin_audit_log_no_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END $$;
CREATE TRIGGER "admin_audit_log_no_update" BEFORE UPDATE ON "admin_audit_log"
  FOR EACH ROW EXECUTE FUNCTION "admin_audit_log_no_update"();
