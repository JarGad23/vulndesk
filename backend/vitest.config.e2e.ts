import { defineConfig } from 'vitest/config';

const url = process.env.TEST_DATABASE_URL ?? 'postgresql://vulndesk:vulndesk@localhost:5432/vulndesk_test';
// The tests truncate every table, so never let them reach another database.
if (!new URL(url).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point to a database ending with _test');
}
process.env.DATABASE_URL = url;

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { DATABASE_URL: url },
    globalSetup: './test/global-setup.ts',
    fileParallelism: false,
  },
});
