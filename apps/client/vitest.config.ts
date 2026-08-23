import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@burningspace/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url)
      ),
      '@burningspace/protocol': fileURLToPath(
        new URL('../../packages/protocol/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    sequence: {
      concurrent: false,
      shuffle: false
    }
  }
});
