-- Wallet vs investment: each balance row gets an invested amount, moved by the client.
ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'invest';
ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'redeem';

ALTER TABLE "balances" ADD COLUMN "invested_balance" DECIMAL(36,18) NOT NULL DEFAULT 0;
ALTER TABLE "balances" ADD CONSTRAINT "balances_invested_non_negative" CHECK ("invested_balance" >= 0);

-- Payout runs now look for invested holdings.
CREATE INDEX "balances_invested_idx" ON "balances"("id") WHERE "invested_balance" > 0;
