import { resolve } from 'node:path';
import {
  BASIC_AUTH_PROVIDER_ID,
  DEFAULT_ACCESS_TTL_SECONDS,
  DEFAULT_REFRESH_TTL_SECONDS
} from '../../lib/constants';

export interface BasicAuthConfig {
  providerId: string;
  enabled: boolean;
  strict: boolean;
  jwtSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  dbPath: string;
  bootstrapEmail?: string;
  bootstrapPassword?: string;
}

export interface BasicAuthConfigDiagnostics {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: BasicAuthConfig;
}

function parsePositiveInt(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function isStrictMode(runtimeConfig: ReturnType<typeof useRuntimeConfig>): boolean {
  if (process.env.OR3_STRICT_CONFIG === 'true') return true;
  if (process.env.NODE_ENV === 'production') return true;
  return runtimeConfig.auth.strict === true;
}

export function getBasicAuthConfig(runtimeConfig?: ReturnType<typeof useRuntimeConfig>): BasicAuthConfig {
  const config = runtimeConfig ?? useRuntimeConfig();
  const enabled = config.auth.enabled === true;
  const providerId = config.auth.provider || BASIC_AUTH_PROVIDER_ID;

  const cwd = process.cwd();
  const configuredDbPath = process.env.OR3_BASIC_AUTH_DB_PATH;
  const dbPath = configuredDbPath
    ? configuredDbPath === ':memory:'
      ? ':memory:'
      : resolve(cwd, configuredDbPath)
    : resolve(cwd, '.data/or3-basic-auth.sqlite');

  const jwtSecret = process.env.OR3_BASIC_AUTH_JWT_SECRET ?? '';
  const refreshSecret = process.env.OR3_BASIC_AUTH_REFRESH_SECRET ?? jwtSecret;

  return {
    providerId,
    enabled,
    strict: isStrictMode(config),
    jwtSecret,
    refreshSecret,
    accessTtlSeconds: parsePositiveInt(
      process.env.OR3_BASIC_AUTH_ACCESS_TTL_SECONDS,
      DEFAULT_ACCESS_TTL_SECONDS
    ),
    refreshTtlSeconds: parsePositiveInt(
      process.env.OR3_BASIC_AUTH_REFRESH_TTL_SECONDS,
      DEFAULT_REFRESH_TTL_SECONDS
    ),
    dbPath,
    bootstrapEmail: process.env.OR3_BASIC_AUTH_BOOTSTRAP_EMAIL,
    bootstrapPassword: process.env.OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD
  };
}

export function validateBasicAuthConfig(runtimeConfig?: ReturnType<typeof useRuntimeConfig>): BasicAuthConfigDiagnostics {
  const config = getBasicAuthConfig(runtimeConfig);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.enabled) {
    warnings.push('auth.enabled=false; basic-auth provider registration skipped.');
  }

  if (config.providerId !== BASIC_AUTH_PROVIDER_ID) {
    warnings.push(`auth.provider=${config.providerId}; basic-auth provider remains idle.`);
  }

  if (!config.jwtSecret) {
    errors.push('Missing OR3_BASIC_AUTH_JWT_SECRET.');
  }

  if (config.accessTtlSeconds > DEFAULT_ACCESS_TTL_SECONDS) {
    warnings.push(
      `OR3_BASIC_AUTH_ACCESS_TTL_SECONDS=${config.accessTtlSeconds} is above recommended ${DEFAULT_ACCESS_TTL_SECONDS}s.`
    );
  }

  if (config.refreshTtlSeconds <= config.accessTtlSeconds) {
    warnings.push(
      'Refresh TTL should be greater than access TTL for practical session refresh behavior.'
    );
  }

  if (
    (config.bootstrapEmail && !config.bootstrapPassword) ||
    (!config.bootstrapEmail && config.bootstrapPassword)
  ) {
    warnings.push(
      'Bootstrap account is partially configured. Set both OR3_BASIC_AUTH_BOOTSTRAP_EMAIL and OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}
