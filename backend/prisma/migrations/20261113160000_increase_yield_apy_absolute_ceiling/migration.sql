-- Update the APY database guard to match the application's absolute ceiling.
ALTER TABLE "yield_rates"
DROP CONSTRAINT "yield_rates_apy_range_chk";

ALTER TABLE "yield_rates"
ADD CONSTRAINT "yield_rates_apy_range_chk"
CHECK (
    "apy_percent" >= 0
    AND "apy_percent" <= 92200000000000000000
);