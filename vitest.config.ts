import { defineConfig } from 'vitest/config';
import path from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~~/': path.resolve(__dirname, '../or3-chat') + '/',
      '~~': path.resolve(__dirname, '../or3-chat'),
      '~/': path.resolve(__dirname, '../or3-chat/app') + '/',
      '~': path.resolve(__dirname, '../or3-chat/app'),
      '#imports': path.resolve(__dirname, '../or3-chat/tests/stubs/nuxt-imports.ts')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000
  }
});
