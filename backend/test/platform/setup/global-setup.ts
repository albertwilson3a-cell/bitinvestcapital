/**
 * Runs once before the platform suites: rebuilds the dedicated test database
 * from the project's real migration files, so every run starts from an empty,
 * fully migrated schema and never touches development or production data.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

export const TEST_DB_ENV = 'TEST_DATABASE_URL';

export default async function globalSetup(): Promise<void> {
  const url = process.env[TEST_DB_ENV];
  if (!url) {
    throw new Error(
      `${TEST_DB_ENV} is not set. Point it at a dedicated, disposable database, e.g.\n` +
        `  ${TEST_DB_ENV}=postgresql://app:app_dev_password@localhost:5432/app_test npm run test:platform`,
    );
  }
  const dbName = new URL(url).pathname.replace(/^\//, '');
  // Safety guard: this drops every table, so refuse anything that isn't obviously a test database.
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to reset "${dbName}": the test database name must contain "test".`);
  }

  const migrationsDir = join(import.meta.dirname, '../../../prisma/migrations');
  const migrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    for (const name of migrations) {
      await client.query(readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8'));
    }
    console.log(`[platform tests] ${dbName}: schema rebuilt from ${migrations.length} migrations`);
  } finally {
    await client.end();
  }
}
