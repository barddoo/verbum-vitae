import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          include: ['packages/shared/src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'worker',
          include: ['worker/src/**/*.test.ts'],
        },
      },
      {
        extends: './app/vite.config.ts',
        test: {
          name: 'app',
          include: ['app/src/**/*.test.ts', 'app/src/**/*.test.tsx'],
        },
      },
    ],
  },
})
