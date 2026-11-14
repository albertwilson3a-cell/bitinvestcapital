import { defineConfig } from 'vitest/config';

/**
 * End-to-end platform suites: real PostgreSQL (dedicated test database, rebuilt
 * from migrations each run), real Redis, real Nest application.
 *   TEST_DATABASE_URL=postgresql://…/app_test npm run test:platform
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/platform/**/*.spec.ts'],
    globalSetup: ['test/platform/setup/global-setup.ts'],
    setupFiles: ['reflect-metadata', 'test/setup-test-env.ts', 'test/platform/setup/env.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    reporters: ['verbose'],
  },
});
