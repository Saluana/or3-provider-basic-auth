import { defineConfig } from 'vitest/config';
import path from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '#imports': path.resolve(__dirname, 'src/test-shims/nuxt-imports.ts'),
      '~~/server/auth/registration': path.resolve(
        __dirname,
        'src/test-shims/server-auth-registration.ts'
      ),
      '~~/server/auth/registry': path.resolve(
        __dirname,
        'src/test-shims/server-auth-registry.ts'
      ),
      '~~/server/auth/store/registry': path.resolve(
        __dirname,
        'src/test-shims/server-auth-store-registry.ts'
      ),
      '~~/server/auth/token-broker/registry': path.resolve(
        __dirname,
        'src/test-shims/server-auth-token-broker-registry.ts'
      ),
      '~~/server/admin/providers/registry': path.resolve(
        __dirname,
        'src/test-shims/server-admin-providers-registry.ts'
      )
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
