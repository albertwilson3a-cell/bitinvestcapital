-- Client-reported deposits to shared (fixed) platform addresses.
CREATE TYPE "deposit_claim_status" AS ENUM ('pending_review', 'credited', 'rejected', 'cancelled');

CREATE TABLE "deposit_claims" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "network" "blockchain_network" NOT NULL,
    "address" VARCHAR(128) NOT NULL,
    "tx_hash" VARCHAR(128) NOT NULL,
    "reported_amount" DECIMAL(36,18) NOT NULL,
    "credited_amount" DECIMAL(36,18),
    "from_address" VARCHAR(128),
    "client_note" VARCHAR(500),
    "status" "deposit_claim_status" NOT NULL DEFAULT 'pending_review',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" VARCHAR(500),
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deposit_claims_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deposit_claims_reported_positive" CHECK ("reported_amount" > 0),
    CONSTRAINT "deposit_claims_credited_positive" CHECK ("credited_amount" IS NULL OR "credited_amount" > 0),
    -- A credited report always carries its amount and ledger transaction.
    CONSTRAINT "deposit_claims_credited_complete" CHECK (
        "status" <> 'credited' OR ("credited_amount" IS NOT NULL AND "transaction_id" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "deposit_claims_transaction_id_key" ON "deposit_claims"("transaction_id");
CREATE INDEX "deposit_claims_status_created_at_idx" ON "deposit_claims"("status", "created_at");
CREATE INDEX "deposit_claims_user_id_created_at_idx" ON "deposit_claims"("user_id", "created_at" DESC);
CREATE INDEX "deposit_claims_network_tx_hash_idx" ON "deposit_claims"("network", "tx_hash");

-- One on-chain transaction can back only one open or credited report, across all clients.
CREATE UNIQUE INDEX "deposit_claims_active_tx_key" ON "deposit_claims"("network", "tx_hash")
    WHERE "status" IN ('pending_review', 'credited');

ALTER TABLE "deposit_claims" ADD CONSTRAINT "deposit_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposit_claims" ADD CONSTRAINT "deposit_claims_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposit_claims" ADD CONSTRAINT "deposit_claims_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
