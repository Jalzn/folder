import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
          exclude: ['**/*.db.test.ts', '**/node_modules/**'],
        },
      },
      {
        test: {
          name: 'db',
          include: ['src/**/*.db.test.ts', 'scripts/**/*.db.test.ts'],
          exclude: ['**/node_modules/**'],
        },
      },
    ],
  },
});
