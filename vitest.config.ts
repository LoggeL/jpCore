import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      SESSION_SECRET: 'x'.repeat(32),
      DATABASE_PATH: ':memory:',
    },
  },
});
