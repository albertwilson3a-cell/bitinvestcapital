-- Login codes, password reset, account suspension and reviewed withdrawals.

ALTER TABLE "users"
    ADD COLUMN "password_reset_token_hash" CHAR(64),
    ADD COLUMN "password_reset_expires_at" TIMESTAMPTZ(6),
    ADD COLUMN "password_changed_at" TIMESTAMPTZ(6),
    ADD COLUMN "suspended_at" TIMESTAMPTZ(6),
    ADD COLUMN "suspension_reason" VARCHAR(500);
CREATE UNIQUE INDEX "users_password_reset_token_hash_key" ON "users"("password_reset_token_hash");

CREATE TYPE "auth_challenge_purpose" AS ENUM ('login', 'withdrawal');

CREATE TABLE "auth_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "auth_challenge_purpose" NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "send_count" INTEGER NOT NULL DEFAULT 1,
    "last_sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_challenges_attempts_chk" CHECK ("attempts" >= 0 AND "send_count" >= 1)
);
CREATE INDEX "auth_challenges_user_id_purpose_created_at_idx" ON "auth_challenges"("user_id", "purpose", "created_at" DESC);
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "withdrawal_status" AS ENUM ('pending_review', 'approved', 'completed', 'rejected', 'cancelled');

CREATE TABLE "withdrawal_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "network" "blockchain_network" NOT NULL,
    "address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "fee" DECIMAL(36,18) NOT NULL,
    "net_amount" DECIMAL(36,18) NOT NULL,
    "status" "withdrawal_status" NOT NULL DEFAULT 'pending_review',
    "transaction_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" VARCHAR(500),
    "completed_by_id" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "tx_hash" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "withdrawal_requests_amounts_chk" CHECK ("amount" > 0 AND "fee" >= 0 AND "net_amount" > 0 AND "net_amount" + "fee" = "amount"),
    CONSTRAINT "withdrawal_requests_completed_chk" CHECK ("status" <> 'completed' OR ("tx_hash" IS NOT NULL AND "completed_at" IS NOT NULL))
);
CREATE UNIQUE INDEX "withdrawal_requests_transaction_id_key" ON "withdrawal_requests"("transaction_id");
CREATE INDEX "withdrawal_requests_status_created_at_idx" ON "withdrawal_requests"("status", "created_at");
CREATE INDEX "withdrawal_requests_user_id_created_at_idx" ON "withdrawal_requests"("user_id", "created_at" DESC);
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "withdrawal_settings" (
    "asset_type" "asset_type" NOT NULL,
    "fee" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "min_amount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "withdrawal_settings_pkey" PRIMARY KEY ("asset_type"),
    CONSTRAINT "withdrawal_settings_values_chk" CHECK ("fee" >= 0 AND "min_amount" >= 0)
);
ALTER TABLE "withdrawal_settings" ADD CONSTRAINT "withdrawal_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
INSERT INTO "withdrawal_settings" ("asset_type") VALUES ('USDT'), ('ETH'), ('BTC') ON CONFLICT DO NOTHING;
