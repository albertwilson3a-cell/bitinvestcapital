-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('client', 'admin');

-- CreateEnum
CREATE TYPE "asset_type" AS ENUM ('USDT', 'ETH', 'BTC');

-- CreateEnum
CREATE TYPE "referral_registration_status" AS ENUM ('pending', 'verified', 'qualified', 'rejected');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('deposit', 'withdrawal', 'yield_payout', 'referral_bonus');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "referral_code" VARCHAR(32) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'client',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "referred_by_user_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referee_id" UUID NOT NULL,
    "registration_status" "referral_registration_status" NOT NULL DEFAULT 'pending',
    "total_commission_earned" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "locked_balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "flexible_yield_earned" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_allocations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "allocation_percentage" DECIMAL(5,2) NOT NULL,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dynamic_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'pending',
    "blockchain_tx_hash" VARCHAR(128),
    "address" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_verification_token_key" ON "users"("verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_referred_by_user_id_idx" ON "users"("referred_by_user_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referee_id_key" ON "referrals"("referee_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "referrals_registration_status_idx" ON "referrals"("registration_status");

-- CreateIndex
CREATE UNIQUE INDEX "balances_user_id_asset_type_key" ON "balances"("user_id", "asset_type");

-- CreateIndex
CREATE INDEX "dynamic_allocations_user_id_active_status_idx" ON "dynamic_allocations"("user_id", "active_status");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_allocations_user_id_asset_type_key" ON "dynamic_allocations"("user_id", "asset_type");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_blockchain_tx_hash_key" ON "transactions"("blockchain_tx_hash");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_fkey" FOREIGN KEY ("referred_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_allocations" ADD CONSTRAINT "dynamic_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
