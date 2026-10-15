import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 25000,
    pool: 'forks',
    server: {
      deps: {
        external: ['@electric-sql/pglite'],
      },
    },
  },
});
