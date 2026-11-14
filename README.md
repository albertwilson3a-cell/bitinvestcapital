# BitInvest Capital

Platform for [bitinvestcapital.com](https://bitinvestcapital.com): NestJS API, Next.js web app, PostgreSQL and a Redis cluster.

| Path | What it is |
|---|---|
| `backend/` | NestJS 12 (TypeScript, ESM) API — Prisma 7 + PostgreSQL, ioredis cluster cache, env validation, `/health` |
| `frontend/` | Next.js 16 (App Router, Cache Components) + Tailwind v4 + shadcn/ui + Recharts + lucide-react, on port 5173 |
| `docker-compose.yml` | PostgreSQL 16 + Redis 7 cluster (3 masters, 3 replicas) + optional backend container |
| `infra/redis/` | Cluster node config and the one-shot cluster bootstrap script |

## Run it on your own computer (fastest path)

```bash
node scripts/setup-local.mjs        # writes .env, backend/.env, frontend/.env.local with fresh secrets
docker compose up -d                # Postgres + Redis cluster
cd backend && npm install && npx prisma generate && npm run prisma:deploy && npm run start:dev
cd frontend && npm install && npm run dev          # http://localhost:5173
```

Verification emails are printed in the backend window (`MAIL_PROVIDER=log`). To deliver them to real
inboxes, set `MAIL_PROVIDER=smtp` plus `SMTP_HOST/PORT/USER/PASSWORD` in `backend/.env` (works with Gmail
App Passwords, Google Workspace, Microsoft 365, Zoho, Brevo, Mailgun…); the backend logs at startup
whether the mail server accepted the login. To fake a confirmed
deposit for a user who has opened the Deposit dialog: `npm run dev:deposit -- <email> USDT 1000`
(from `backend/`). Promote an admin with `npm run admin:promote -- <email>`.

## Quick start (backend on host)

```bash
cp .env.example .env                 # set POSTGRES_PASSWORD and REDIS_PASSWORD
docker compose up -d                 # postgres + redis cluster (init job forms the cluster)
cd backend
cp .env.example .env                 # development: NODE_ENV=development, FRONTEND_URL and
                                     # CORS_EXTRA_ORIGINS=http://localhost:5173, MAIL_PROVIDER=log,
                                     # DATABASE_URL/REDIS_* matching the root .env
npm install
npm run prisma:deploy                # applies prisma/migrations
npm run start:dev                    # http://localhost:3000/health
```

Frontend: `cd frontend && cp .env.example .env.local && npm install && npm run dev` → http://localhost:5173

## Everything in containers

```bash
docker compose --profile app up -d --build
```

The backend container runs `prisma migrate deploy` before starting. Inside the compose network it reaches Redis at `redis-node-N:6379`, so leave `REDIS_NAT_MAP` unset there.

## Redis cluster from the host

Nodes announce their compose hostnames (`redis-node-1` … `redis-node-6`). A backend running on the host reaches them via published ports 7001–7006, and `REDIS_NAT_MAP` in `backend/.env` translates the announced addresses to those ports. That value is already set in `.env.example`.

## Database schema

`backend/prisma/schema.prisma` — tables and columns are snake_case in Postgres; the Prisma client uses camelCase.

| Table | Key relations / constraints |
|---|---|
| `users` | self-relation `referred_by_user_id → users.id` (SET NULL); unique `email`, `referral_code`, `verification_token`; `role` enum `client` / `admin` |
| `referrals` | `referrer_id → users`, `referee_id → users` (unique — one referral per referee); `registration_status`, `total_commission_earned` |
| `balances` | `user_id → users`; unique `(user_id, asset_type)`; `balance`, `locked_balance`, `flexible_yield_earned` |
| `dynamic_allocations` | `user_id → users`; unique `(user_id, asset_type)`; `allocation_percentage` DECIMAL(5,2), `active_status` |
| `transactions` | `user_id → users` (RESTRICT, keeps ledger history); `type` deposit / withdrawal / yield_payout / referral_bonus; `status`; unique `blockchain_tx_hash` |

Monetary columns are `DECIMAL(36,18)` — enough for 18-decimal ETH/ERC-20 amounts without float rounding.

Schema changes: edit `schema.prisma`, then `npm run prisma:migrate -- --name <change>`.

## Authentication & email onboarding

All routes require a `Authorization: Bearer <jwt>` header unless marked public. Routes sit under the `/api` prefix.

| Route | Access | What it does |
|---|---|---|
| `POST /api/auth/register` | public | `{ email, password, referralCode? }` → creates the user, zero BTC/ETH/USDT balances, an 8-char referral code, and (if referred) a `pending` referral; emails the verification link |
| `GET /api/auth/verify?token=…` / `POST /api/auth/verify` | public | Consumes the token once, sets `is_verified`, clears the token, marks the referral `verified` |
| `POST /api/auth/resend-verification` | public | `{ email }` → new token + email (60 s cooldown per address, same response whether or not the account exists) |
| `POST /api/auth/login` | public | `{ email, password }` → `{ accessToken, tokenType, expiresIn, user }`; returns 403 until the email is verified |
| `GET /api/auth/me` | JWT | Profile and balances |

How it's secured:
- Passwords are hashed with bcrypt (`BCRYPT_ROUNDS`, default 12).
- Passwords must be 8–72 characters with an uppercase letter, a lowercase letter and a digit.
- Verification tokens are 32 random bytes. The email carries the raw token; the database stores only its SHA-256 hash, which expires after `VERIFICATION_TOKEN_TTL_MINUTES` (default 24 h). A conditional update makes each token single-use, even with concurrent clicks.
- Login takes the same time whether or not the email exists.
- The JWT is HS256 and the user is reloaded on every request, so deleted or unverified accounts lose access immediately.
- Request bodies and queries are validated with `class-validator`; unknown fields are rejected.


Mail transport is selected by `MAIL_PROVIDER`: `sendgrid` (needs `SENDGRID_API_KEY`), `ses` (needs `AWS_REGION` plus AWS credentials), or `log` (prints the email to the console; refused when `NODE_ENV=production`). SendGrid click tracking is disabled so the verification link isn't rewritten.

## Deposits & ledger

### Deposit addresses (watch-only HD derivation)
The server holds only **account-level extended public keys**. It can derive addresses but can never sign or spend. Private keys stay in your custody setup (hardware wallet, MPC, HSM).

| Asset | Network | Derivation | Format |
|---|---|---|---|
| ETH | Ethereum | `ETH_ACCOUNT_XPUB` / `0/<i>` (m/44'/60'/0'/0/i) | EIP-55 address |
| USDT | Ethereum (ERC-20) | same xpub, **separate index** | EIP-55 address |
| BTC | Bitcoin | `BTC_ACCOUNT_XPUB` (xpub/zpub) / `0/<i>` (m/84'/0'/0'/0/i) | native SegWit `bc1q…` |

- Each user gets one dedicated address per asset, created on first request.
- Indices come from a per-network counter that is incremented inside the same transaction as the insert, so indices are never reused or skipped.
- Derivation is checked against the official BIP44/BIP84 test vectors.
- The server refuses to start if an xprv is supplied.
- It also refuses to start in production with the public test-mnemonic xpubs used in the dev `.env`.
- Because addresses are created on demand, your custody wallet should scan with a generous gap limit.

`GET /api/wallets` returns balances and deposit addresses. `GET /api/wallets/:asset/deposit-address` returns a single address. `GET /api/wallets/transactions?limit&cursor&asset&type` returns paginated history. All three require a JWT.

### Webhook: `POST /payments/webhook`
This endpoint has no `/api` prefix. Your blockchain infrastructure provider, or your own chain indexer, posts here. Every request must be signed:

```
X-Webhook-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>." + raw_body)>
```

```bash
# How a sender signs (bash):
T=$(date +%s); SIG=$(printf '%s' "$T.$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -X POST https://api.bitinvestcapital.com/payments/webhook -H "content-type: application/json" \
     -H "x-webhook-signature: t=$T,v1=$SIG" -d "$BODY"
```

Checks, in order:
1. HMAC over the **raw bytes**, compared in constant time. The request is rejected (401) if the timestamp is more than `WEBHOOK_TOLERANCE_SECONDS` away from server time. Several secrets can be configured at once, for rotation.
2. The JSON is parsed from those same signed bytes and validated with class-validator.
3. Business checks. Any failure is recorded and acknowledged with `ignored`, and nothing is credited:
   - the asset must match its network;
   - USDT must come from the configured `USDT_CONTRACT_ADDRESS`;
   - the amount must be positive and use no more decimals than the asset allows;
   - the destination must be an address we issued;
   - a later event for the same on-chain output can't change the amount or recipient recorded earlier.

Payload:
```json
{ "id": "evt_…", "type": "deposit.confirmed", "createdAt": "2026-10-31T08:00:00Z",
  "data": { "network": "ethereum", "asset": "USDT", "txHash": "0x…", "outputIndex": 0,
            "toAddress": "0x…", "fromAddress": "0x…", "amount": "1000.50",
            "confirmations": 14, "blockNumber": 21000000, "blockHash": "0x…",
            "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7" } }
```
- `type` is `deposit.pending` or `deposit.confirmed`. Other types are acknowledged and ignored.
- `outputIndex` is the ERC-20 log index or the BTC vout.
- `amount` is a decimal string in whole units.
- A deposit is credited only when `confirmations` reaches `MIN_CONFIRMATIONS_<ASSET>`. Below that it stays `pending`.

Responses: `200` with an outcome of `credited`, `pending`, `already_credited`, `duplicate_event` or `ignored`. `401` for a bad signature, `400` for a malformed signed payload, `503` for a temporary condition (e.g. a price is needed and unavailable), which the provider should retry.

### Ledger guarantees
All writes for one event run in **one Prisma interactive transaction** (READ COMMITTED with row locks):
1. **Claim the event id** (`INSERT … ON CONFLICT DO NOTHING`). Replays become `duplicate_event`. The claim only persists if the whole ledger write commits.
2. **Match the owner** by destination address.
3. **Record the transfer once.** The output key `(network, tx_hash, output_index)` is unique. Moving `pending` → `completed` is a conditional update, so concurrent confirmations credit exactly once.
4. **Credit the balance** with `balance = balance + x` under a row lock. A database CHECK keeps balances from ever going negative.
5. **Pay the referral reward**, if the depositor has `referred_by_user_id` and the referral isn't `rejected`:
   - The reward is `amount × USD price × REFERRAL_REWARD_RATE` (1%), rounded down to 6 decimals.
   - It is credited to the referrer's **USDT** wallet and logged as a `referral_bonus` transaction, with `source_transaction_id` pointing to the deposit (unique, so at most one bonus per deposit).
   - The referral's `total_commission_earned` is updated and its status set to `qualified`.

USD prices for BTC/ETH come from CoinGecko (`PRICE_API_URL`, optional `PRICE_API_KEY`), are cached in Redis, and are fetched **before** the transaction opens. USDT is valued at 1.

## Portfolio allocations & yield engine

### Allocations: `GET` / `PUT /api/portfolio/allocations` (JWT)
```json
{ "allocations": [{ "asset": "BTC", "percentage": 40 }, { "asset": "ETH", "percentage": 60 }] }
```
Validation, using custom class-validator constraints:
- percentages must sum to **exactly 100**, checked in integer basis points so `33.33 + 33.33 + 33.34` passes and `100.01` fails;
- each asset may appear only once;
- each percentage is greater than 0, at most 100, with at most 2 decimals.

A `PUT` replaces the whole allocation. **Only assets with an active allocation earn yield**; assets left out are deactivated. The percentages are stored as the user's target weights. Nothing moves funds between assets, because there is no trading or rebalancing integration.

### Admin panel: `/api/admin/yields` (ADMIN role)
| Route | Purpose |
|---|---|
| `GET /api/admin/yields` | Current rate matrix (APY, interval, derived per-period rate), affiliate rate, APY ceiling |
| `PUT /api/admin/yields/:asset` | `{ apyPercent, interval: "HOURLY"\|"DAILY", isActive?, note? }`. Adds a new version; old rates are never edited |
| `GET /api/admin/yields/history?asset=&limit=` | Rate changes, with the admin who made each one |
| `GET /api/admin/yields/runs` | Payout runs with counts and per-asset totals |
| `POST /api/admin/yields/runs` | `{ interval }`: run (or resume) the latest completed period now; idempotent |

Make someone an admin (the account must already be verified): `npm run build && npm run admin:promote -- ops@bitinvestcapital.com`. Changes above `YIELD_MAX_APY_PERCENT` are rejected.

### Payout engine (`@nestjs/schedule`)
- **Crons:** `0 0 * * *` UTC pays assets set to DAILY for the day that just ended; `0 * * * *` pays HOURLY assets for the hour that just ended. On startup it catches up the latest period if a cron was missed. Older missed periods are not backfilled, because payouts use current balances.
- **Rate:** the per-period rate is `(1 + APY)^(1/n) − 1` (n = 365 or 8,760). Because each payout is credited to the balance, compounding gives exactly the stated APY over a year.
- **Principal** = balance − deposits and deposit referral bonuses credited after the period started. New money has to be held for a full period before it earns. Earlier yield and affiliate rewards compound.
- **Payout** = `trunc(principal × rate, asset decimals)`. It is credited to `balance`, added to `flexible_yield_earned`, and logged as a `yield_payout` transaction tied to the run.
- **Affiliate reward:** `AFFILIATE_YIELD_REWARD_RATE` (5%) of each payout, credited to the **direct** referrer in the **same asset** as an `affiliate_yield_reward` transaction linked to the payout. Referrals marked `rejected` are skipped.

How the batch runs:
- Each payout period is claimed with a unique key, so it's paid once even with several app instances.
- Holdings are processed in batches of `YIELD_BATCH_SIZE`. Each batch is one Postgres transaction of four set-based statements (lock and compute → credit holders → create affiliate rewards → credit referrers, summed per referrer).
- Unique keys make a crashed run safe to resume: `POST /runs` or the next startup picks up `failed` runs and runs stuck in `running`.
- Benchmark in this sandbox: **40,000 holdings → 40,000 payouts + 40,000 affiliate rewards in 7.2 s**.

## Frontend

Public site (`app/(site)`): home, `/markets` plus a page per coin (`/markets/btc` …), `/earn`
(rates + compounding calculator), `/referral` (rewards calculator), `/security`, `/learn` with six
guides and a glossary, `/about`, `/faq`, `/risk-disclosure`. Signed-in clients get `/dashboard`
(now with a projected-returns chart and coin charts) and `/dashboard/markets`.

Market data for the 14 tracked coins (BTC, ETH, USDT, BNB, SOL, XRP, USDC, TRX, ADA, TON, AVAX, POL,
ATOM, ARB) comes from the public endpoints `GET /api/market/coins`, `GET /api/market/coins/:symbol/chart?range=1D|7D|30D|90D|1Y`
and `GET /api/market/catalog` (CoinGecko in production, a deterministic simulated feed with
`PRICE_PROVIDER=simulated`). Rates shown anywhere on the site come from `GET /api/market/rates`, so the
site never advertises a rate the engine is not paying. Deposits are currently BTC, ETH and USDT (ERC-20);
the other chains are listed as "coming soon".

Starting rates (migration `20261101000000_default_yield_rates`, only on databases without rates):
USDT 9.5%, ETH 4%, BTC 2.5% APY, paid daily. Change them in Admin → Parameters.

| Route | What it does |
|---|---|
| `/register` | Sign-up with live password rules and an optional referral code (`?ref=CODE` prefills it) |
| `/verify?token=…` | Target of the email link: confirms the token with the API once, shows a confirmation screen, then opens sign-in after 5 s |
| `/login` | Sign-in; `?next=` returns the user to the page they came from (same-site paths only) |
| `/dashboard` | Net worth, holdings donut, yield accrual chart, live prices, allocation sliders, deposit addresses, activity ledger |

**Sessions.** The browser never sees the JWT.
- `POST /api/session/login` exchanges credentials for the token and stores it in an `httpOnly`, `SameSite=Lax` cookie (also `Secure` in production).
- Data calls go through `/api/backend/*`, which attaches the token and forwards to `BACKEND_URL/api/*`.
- The relay rejects path traversal, refuses `auth/login` (so a token can't be handed to page scripts), and blocks cross-site writes with an Origin check.
- `src/proxy.ts` redirects to sign-in when the cookie is missing. NestJS still authorizes every request.

**Live data.** Prices refresh every 5 s from `GET /api/market/prices`, balances and activity every 15 s. Pending deposits appear under "Processing" with confirmation progress.

**Allocation sliders.** Weights are kept in integer basis points, and moving one slider rebalances the others proportionally, so the total is always exactly 100.00%. Tested with 2,000 random moves, no drift. Switching an asset off stops its yield.

**Prices in development.** `PRICE_PROVIDER=simulated` on the API gives a random-walk price feed when CoinGecko isn't reachable. The UI marks it "Simulated", and the API refuses it in production.

Design tokens are in `src/app/globals.css`: ink-navy surfaces, 1px rules, brass accent, fixed asset colours. Type is IBM Plex Sans with tabular figures, plus Instrument Serif for the net-worth figure. Fonts are self-hosted via Fontsource, so there are no Google Fonts requests.

`npm run dev` · `npm run build` · `npm run lint` · `npm test`

## Admin console (`/admin`)

**Access.**
- `src/proxy.ts` sends signed-out visitors to sign-in.
- Each admin page renders its content only after `GET /api/auth/me` confirms `role === 'ADMIN'`. Until then no admin API call is made; non-admins see "Admin access required".
- Every `/api/admin/*` route is protected server-side by the global JWT guard plus `@Roles(ADMIN)`. The role is re-read from the database on each request, so demoting someone takes effect on their next click.

| Page | What it does |
|---|---|
| Overview | Total value locked (by asset, live USD), net deposits (30 days vs the previous 30, daily bars, deposits confirming), affiliate payout volume (deposit bonuses + yield shares), verified accounts (verification rate, daily verifications); plus the approval queue and recent admin activity |
| Users | Search by email, referral code or user ID; filter by role and verification; sort; paginated with a total count. Row menu: **View portfolio**, **Identity record**, **Adjust balance**, **Copy user ID** |
| Adjustments | Maker–checker approval queue (awaiting approval / applied / rejected) |
| Parameters | Per-asset interest (APY, hourly or daily, active/paused), referral payout rates, change history, payout runs |
| Audit log | Every admin action, including opening a customer record; entries can't be edited |

**Balance adjustments are maker–checker.**
- One admin requests an adjustment with a reason (at least 15 characters) and an optional case reference. The balance does not change.
- A **different** admin approves it. That locks the balance row, refuses any debit that would overdraw, posts an `adjustment_credit` / `adjustment_debit` ledger entry the customer sees (with the reason), and updates the balance.
- Nobody can adjust their own account or approve their own request. This is enforced in the service and by database CHECK constraints.
- Two simultaneous approvals apply once (tested).
- **You need at least two admins** to apply an adjustment.

**Platform parameters.**
- Referral rates (`referral.deposit_reward_rate`, `referral.affiliate_yield_rate`) live in `platform_settings`, with every change recorded in `platform_setting_changes`. Until an admin sets one, the env value applies.
- The ledger reads the deposit bonus rate on each deposit.
- The yield engine records the affiliate share on each run when it starts, so a resumed run pays the same rate.
- Caps: deposit bonus 10%, yield share 50%, APY `YIELD_MAX_APY_PERCENT`.

API: `GET /api/admin/metrics` · `GET /api/admin/users` · `GET /api/admin/users/:id` · `POST /api/admin/users/:id/adjustments` · `GET /api/admin/adjustments` · `POST /api/admin/adjustments/:id/approve|reject` · `GET|PUT /api/admin/settings` · `GET /api/admin/audit` · plus `/api/admin/yields*`.

## Scripts (backend)

`build`, `admin:promote -- <email>`, `start:dev`, `start:prod`, `typecheck`, `lint`, `test` (unit, `src/**`), `test:e2e` (needs the stack running), `test:platform`, `test:all`, `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:studio`, `db:reset`.

## Platform test suite

`npm run test:platform` runs four end-to-end suites in `backend/test/platform/` against the real
NestJS app, real Postgres and real Redis. Only the outbound edges are swapped: email delivery is
captured in memory so the suite can read verification links, and market prices are pinned
(BTC 60,000 / ETH 3,000 / USDT 1) so payouts are deterministic.

| Suite | File | Covers |
| --- | --- | --- |
| Auth & verification | `auth-verification.spec.ts` | registration, bcrypt cost/salting, hashed 24h token, `/auth/verify`, JWT iss/aud |
| Allocation math | `allocation-math.spec.ts` | sums of exactly 100% pass; 105%, 90%, 99.99%, 100.01% and malformed input return 400 |
| Referral & webhook | `referral-webhook.spec.ts` | HMAC-signed deposits, exact crediting, 1% USDT referral bonus, replay/forgery rejection, ledger reconciliation |
| Yield cron | `yield-cron.spec.ts` | cron registration, per-period compound yield, 5% affiliate share, exclusions, idempotency |

The suite needs a dedicated database whose name contains `test`. It wipes and rebuilds that
database from `prisma/migrations` on every run:

```bash
createdb -U app app_test   # once
TEST_DATABASE_URL=postgresql://app:app_dev_password@localhost:5432/app_test?schema=public npm run test:platform
npm run test:all           # unit + e2e + platform
```

## Live chat

Signed-in clients see a **Live chat** button on every `/dashboard` page (never on the public site).
Messages go to the admin console → **Live chat**, which lists conversations with unread badges, lets
staff reply, and mark threads resolved (recorded in the audit log). Polling every few seconds keeps
both sides up to date; clients are limited to 20 messages a minute. API: `GET/POST /api/support/conversation…`
for clients, `/api/admin/support/…` for admins.

## Sign-in security

- **Email code on every sign-in:** `POST /api/auth/login` checks the password and emails a 6-digit code
  (valid `LOGIN_CODE_TTL_MINUTES`, 5 attempts, resend after 30 s); `POST /api/auth/login/verify` issues
  the session. Only an HMAC of each code is stored.
- **Password reset:** `POST /api/auth/password/forgot` emails a single-use link (1 hour);
  `POST /api/auth/password/reset` requires the password twice. Changing a password signs out every
  other session. The website blocks paste/copy/drag on new-password fields.
- **Suspension:** admins can suspend/restore accounts (blocks sign-in, sessions and withdrawals).

## Withdrawals (manually reviewed)

Client: choose asset, amount and address → confirm with an emailed code → the amount moves to
`locked_balance` (status *awaiting review*). Admin console → **Withdrawals**: review details and risk
flags → **Approve** → send from custody → **Mark as sent** with the transaction hash (locked funds are
debited, the client is emailed the explorer link), or **Reject** (funds return to the balance).
Clients can cancel while awaiting review. Per-asset fee, minimum and on/off switch are set in the same
admin page. Every action is in the audit log.

## Market data

Live prices from CoinGecko (`PRICE_PROVIDER=coingecko`, the default). One shared feed serves the website,
dashboard and ledger; requests are spaced to stay inside CoinGecko’s rate limit, and the last good
data is served if CoinGecko is briefly unreachable. A free demo key (`PRICE_API_KEY`) raises the limit;
use a paid plan in production. `simulated` exists only for automated tests and is refused in production.


## Deposit addresses (shared) and deposit reports

The deposit addresses clients see are set in `backend/.env`:

```
DEPOSIT_ADDRESS_BTC=bc1q84ma6k9jpmtj7m94fxy5jhufcp0hr68fqx9xvf
DEPOSIT_ADDRESS_ETH=0x86EF1E2Fb0454218d3eADe4aBCfD359F24B8068e
DEPOSIT_ADDRESS_USDT=0x86EF1E2Fb0454218d3eADe4aBCfD359F24B8068e
```

They are checked when the server starts (a typo stops it starting rather than reaching clients),
and they cannot be changed from the admin website.

Because every client sees the same address, the blockchain alone cannot say who sent a payment:

1. The client sends crypto, then presses **I've sent it** in the Deposit window and pastes the transaction hash.
2. Admin → **Deposits** lists reports to check. **Check on blockchain** looks the transaction up
   (mempool.space for BTC, a public Ethereum node for ETH/USDT) and shows the amount that reached the address,
   the confirmations and the sender.
3. The admin credits the amount that actually arrived (or rejects with a reason). The client is emailed at each step.

A transaction hash can back only one open or credited report, across all accounts.
Remove a `DEPOSIT_ADDRESS_…` line to go back to a personal address per client (derived from the xpub).

To add these settings to an existing installation without changing anything else: `node scripts/setup-local.mjs`.


## Returns per week (admin)

Admin → **Rates & parameters** → **Returns per week** has one slot per active coin.
Enter the weekly return (e.g. `0.1742` for 0.1742% a week). The server stores it and derives the yearly
rate used for payouts: APY = (1 + weekly)^(365/7) − 1, so seven daily payouts compound to exactly the weekly
figure. Every change is versioned, audited and shown to clients within ~20 seconds.

The highest allowed rate is 100% a year (≈1.3382% a week). `YIELD_MAX_APY_PERCENT` can lower it but not raise it.

## Light and dark theme

Visitors pick Light, Dark or Auto (follows the device) in the footer under Preference, or with the sun/moon
button in the dashboard and admin console. The choice is stored in the browser (`bic-theme`).


## Wallet and investment

Each balance row has two parts: `balance` (the BitInvest wallet, where deposits land and the only
source of withdrawals) and `invested_balance` (earns the asset's weekly rate). Clients move funds with
`POST /api/investments/invest` (minimum `investment.min_usd`, default $50, admin-editable) and
`POST /api/investments/redeem` (amount or `all: true`). Both write INVEST / REDEEM ledger rows and use
conditional updates, so neither side can be overdrawn. `GET /api/investments` returns the per-coin
summary (with `earningPrincipal`: money invested during the running period starts earning next period);
`GET /api/investments/:asset/history` rebuilds the invested amount over time from the ledger.

The payout engine pays only on `invested_balance`, excludes amounts invested after the period started,
and adds each payout to the investment (compounding). Referral rewards go to the wallet.
