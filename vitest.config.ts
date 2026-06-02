import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/tests/**/*.test.ts'],
    globals: true,
  },
});
