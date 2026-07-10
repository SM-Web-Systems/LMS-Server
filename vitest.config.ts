import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 10000,
    // Each parallel test file opens the DB at import; use an isolated in-memory
    // DB so workers don't contend on the on-disk file (setup.ts resets per test).
    env: { DATABASE_PATH: ':memory:' },
  },
});
