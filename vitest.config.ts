import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@burningspace/shared': fileURLToPath(
        new URL('./packages/shared/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    environment: 'node',
    include: ['apps/server/test/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/public/**',
      '**/archives/**',
      '**/artifacts/**',
      '**/*.zip',
      '**/*.tar',
      '**/*.tar.gz'
    ],
    fileParallelism: false,
    maxWorkers: 1,
    sequence: {
      concurrent: false,
      shuffle: false
    }
  }
});
