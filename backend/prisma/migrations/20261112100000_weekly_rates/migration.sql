-- Rates can be entered per week; the APY used for payouts is derived from it.
ALTER TABLE "yield_rates" ADD COLUMN "weekly_percent" DECIMAL(12,6);
ALTER TABLE "yield_rates" ADD CONSTRAINT "yield_rates_weekly_non_negative" CHECK ("weekly_percent" IS NULL OR "weekly_percent" >= 0);
