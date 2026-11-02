#!/usr/bin/env node
/**
 * LOCAL TESTING ONLY. Pretends to be the blockchain provider: signs a
 * "deposit.confirmed" webhook exactly like a real provider would and posts it
 * to the running backend, so you can see a deposit (and any referral bonus)
 * land without sending real crypto.
 *
 *   npm run dev:deposit -- <email> <USDT|ETH|BTC> <amount>
 *   npm run dev:deposit -- alice@example.com USDT 1000
 *
 * The user must have opened the Deposit dialog for that asset once, which is
 * when their deposit address is created.
 */
import { createHmac, randomBytes } from 'node:crypto';
import pg from 'pg';

try {
  process.loadEnvFile('.env');
} catch {
  console.error('No .env found. Run this from the backend folder.');
  process.exit(1);
}

const [emailArg, assetArg, amount] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const asset = assetArg?.trim().toUpperCase();
if (!email || !['USDT', 'ETH', 'BTC'].includes(asset ?? '') || !/^\d+(\.\d+)?$/.test(amount ?? '')) {
  console.error('Usage: npm run dev:deposit -- <email> <USDT|ETH|BTC> <amount>');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to simulate deposits when NODE_ENV=production.');
  process.exit(1);
}

const secret = (process.env.WEBHOOK_SIGNING_SECRETS ?? '').split(',')[0]?.trim();
if (!secret) {
  console.error('WEBHOOK_SIGNING_SECRETS is empty in .env');
  process.exit(1);
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let row;
try {
  const res = await db.query(
    `SELECT da.address, da.network::text AS network
       FROM deposit_addresses da JOIN users u ON u.id = da.user_id
      WHERE u.email = $1 AND da.asset_type = $2::asset_type`,
    [email, asset],
  );
  row = res.rows[0];
} finally {
  await db.end();
}
if (!row) {
  console.error(`No ${asset} deposit address for ${email} yet.`);
  console.error(`Log in as that user, click "Deposit", choose ${asset}, then run this again.`);
  process.exit(1);
}

const isEvm = row.network === 'ethereum';
const confirmations = Number(process.env[`MIN_CONFIRMATIONS_${asset}`] ?? 12) + 2;
const payload = {
  id: `evt_local_${randomBytes(8).toString('hex')}`,
  type: 'deposit.confirmed',
  createdAt: new Date().toISOString(),
  data: {
    network: row.network,
    asset,
    txHash: isEvm ? `0x${randomBytes(32).toString('hex')}` : randomBytes(32).toString('hex'),
    outputIndex: 0,
    toAddress: row.address,
    amount,
    confirmations,
    blockNumber: isEvm ? 21_000_000 : 880_000,
    ...(asset === 'USDT' ? { contractAddress: process.env.USDT_CONTRACT_ADDRESS } : {}),
  },
};

const body = JSON.stringify(payload);
const t = Math.floor(Date.now() / 1000);
const v1 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/payments/webhook`;

let res;
try {
  res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-signature': `t=${t},v1=${v1}` },
    body,
  });
} catch {
  console.error(`Could not reach ${url}. Is the backend running (npm run start:dev)?`);
  process.exit(1);
}
const text = await res.text();
console.log(`${res.status} ${res.statusText}`);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
process.exit(res.ok ? 0 : 1);
