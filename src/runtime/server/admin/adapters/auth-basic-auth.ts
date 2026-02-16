import type { H3Event } from 'h3';
import type {
  ProviderAdminAdapter,
  ProviderAdminStatusResult,
  ProviderStatusContext,
} from '~~/server/admin/providers/types';
import { BASIC_AUTH_PROVIDER_ID } from '../../../lib/constants';
import { validateBasicAuthConfig } from '../../lib/config';

export const basicAuthAdminAdapter: ProviderAdminAdapter = {
  id: BASIC_AUTH_PROVIDER_ID,
  kind: 'auth',

  async getStatus(_event: H3Event, ctx: ProviderStatusContext): Promise<ProviderAdminStatusResult> {
    const diagnostics = validateBasicAuthConfig(useRuntimeConfig());

    const warnings: ProviderAdminStatusResult['warnings'] = [];
    for (const message of diagnostics.warnings) {
      warnings.push({ level: 'warning', message });
    }
    for (const message of diagnostics.errors) {
      warnings.push({ level: 'error', message });
    }

    if (ctx.enabled && !diagnostics.isValid) {
      warnings.push({
        level: 'error',
        message: 'Basic-auth configuration is invalid. Authentication may fail.',
      });
    }

    return {
      details: {
        dbPath: diagnostics.config.dbPath,
        jwtSecretConfigured: Boolean(diagnostics.config.jwtSecret),
        refreshSecretConfigured: Boolean(diagnostics.config.refreshSecret),
        bootstrapConfigured:
          Boolean(diagnostics.config.bootstrapEmail) &&
          Boolean(diagnostics.config.bootstrapPassword),
        accessTtlSeconds: diagnostics.config.accessTtlSeconds,
        refreshTtlSeconds: diagnostics.config.refreshTtlSeconds,
      },
      warnings,
      actions: [],
    };
  },
};
