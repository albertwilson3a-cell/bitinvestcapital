-- Starting yield rates (annual percentage yield, paid daily). Inserted only for
-- assets that have no rate yet, so existing installations keep their settings.
-- Administrators change these in Admin -> Parameters; every change is a new row.
INSERT INTO "yield_rates" ("id", "asset_type", "apy_percent", "interval", "is_active", "note", "created_by_user_id")
SELECT gen_random_uuid(), v.asset::"asset_type", v.apy, 'daily'::"yield_interval", true, 'Starting rate', NULL
FROM (VALUES ('USDT', 9.5), ('ETH', 4.0), ('BTC', 2.5)) AS v(asset, apy)
WHERE NOT EXISTS (SELECT 1 FROM "yield_rates" r WHERE r."asset_type" = v.asset::"asset_type");
