# or3-provider-basic-auth

Basic-auth provider for OR3 Chat SSR mode.

This package registers:

- `AuthProvider` (`basic-auth`)
- `ProviderTokenBroker` (`basic-auth`)
- admin status adapter (`auth-basic-auth`)
- provider-owned auth UI adapter + components

## Installation

```bash
bun add or3-provider-basic-auth
```

For local development from the OR3 monorepo:

```bash
# from /Users/brendon/Documents/or3/or3-chat
bun add or3-provider-basic-auth@link:../or3-provider-basic-auth
```

## Runtime registration

Add the module to your generated provider list:

```ts
export const or3ProviderModules = [
  'or3-provider-basic-auth/nuxt'
] as const;
```

## Environment

Required:

- `AUTH_PROVIDER=basic-auth` (alias: `OR3_AUTH_PROVIDER`)
- `SSR_AUTH_ENABLED=true`
- `OR3_BASIC_AUTH_JWT_SECRET`
- `OR3_BASIC_AUTH_REFRESH_SECRET` (use a separate random value; the provider validates it independently)

Optional:

- `OR3_BASIC_AUTH_ACCESS_TTL_SECONDS` (default `900`)
- `OR3_BASIC_AUTH_REFRESH_TTL_SECONDS` (default `2592000`)
- `OR3_BASIC_AUTH_ROTATION_GRACE_MS` (default `30000`; concurrent-refresh grace window)
- `OR3_BASIC_AUTH_DB_PATH` (default `./.data/or3-basic-auth.sqlite`)
- `OR3_BASIC_AUTH_BOOTSTRAP_EMAIL`
- `OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD`
- `OR3_BASIC_AUTH_RATE_LIMIT_BACKEND` (`sqlite` default; `memory` is per-process and intended for single-instance development only)
- `OR3_BASIC_AUTH_ALLOW_INSECURE_DEV` (`true` in non-production to start with missing secrets instead of failing)

Registration mode is a core-auth policy, not a provider setting:

- `OR3_AUTH_REGISTRATION_MODE=open|invite_only|disabled`
- `OR3_AUTH_INVITE_TOKEN_SECRET` and `OR3_AUTH_INVITE_TOKEN_TTL_SECONDS` (required for `invite_only`)

Strict-mode behavior:

- `NODE_ENV=production`, `OR3_STRICT_CONFIG=true`, or runtime config `auth.strict=true` fails startup if required secrets are missing.
- In non-strict (development) mode, missing secrets also fail startup unless `OR3_BASIC_AUTH_ALLOW_INSECURE_DEV=true` is set — then diagnostics are logged and provider registration is left disabled.

## Architecture notes

- Credentials/session state is stored in a provider-owned SQLite DB.
- Canonical OR3 users/workspaces are still resolved by the selected `AuthWorkspaceStore`.
- In `invite_only` mode, signed-token, expiry, persisted invite state/token hash, and normalized-email validation runs before Basic Auth creates an account or session.
- The selected `AuthWorkspaceStore` must support atomic invite provisioning; internal user/auth mapping, membership, and invite consumption are committed together by that provider.
- Basic Auth account and initial refresh-session rows are created in one local SQLite transaction.
- Access JWTs are short-lived and validated by `basicAuthProvider.getSession(event)`.
- Refresh tokens are rotated and hashed at rest; replay attempts revoke active sessions.
- The refresh cookie is scoped to `/api` so `/api/auth/session` can transparently rotate expired access tokens during session resolution.
- The SQLite DB file and directory are hardened to mode `0600`/`0700`; the DB uses WAL journaling.

## Runtime entrypoints

| File | Purpose |
|---|---|
| `src/module.ts` | Nuxt module entry — wires `/api/basic-auth/*` handlers, server plugin, and client plugins |
| `src/runtime/server/plugins/register.ts` | Registers auth provider + token broker + admin adapter into core registries; bootstraps account |
| `src/runtime/server/auth/basic-auth-provider.ts` | Auth provider — session resolution from access tokens with refresh-token recovery |
| `src/runtime/server/token-broker/basic-auth-token-broker.ts` | Token broker for direct-mode providers |
| `src/runtime/server/admin/adapters/auth-basic-auth.ts` | Admin status adapter (config diagnostics) |
| `src/runtime/server/api/basic-auth/*.post.ts` | Sign-in / register / sign-out / refresh / change-password endpoints |
| `src/runtime/server/db/client.ts` | SQLite client + migrations (`basic_auth_accounts`, `basic_auth_sessions`, `basic_auth_rate_limits`) |
| `src/runtime/server/lib/*.ts` | Config, JWT, cookies, password, rate-limit, session store, refresh rotation |
| `src/runtime/plugins/basic-auth-ui.client.ts` | Registers auth UI adapter + lock-page adapter |
| `src/runtime/plugins/auth-status.client.ts` | Client auth-status resolver + silent-refresh recovery |
| `src/runtime/components/*.client.vue` | Provider-owned auth UI (modals, user menu, sidebar button, lock page) |

## Troubleshooting

- `Authentication provider is not configured`
  - Ensure `AUTH_PROVIDER=basic-auth` and `SSR_AUTH_ENABLED=true`.
  - Ensure `OR3_BASIC_AUTH_JWT_SECRET` and `OR3_BASIC_AUTH_REFRESH_SECRET` are set.

- `Missing OR3_BASIC_AUTH_JWT_SECRET` / `Missing OR3_BASIC_AUTH_REFRESH_SECRET`
  - In strict mode (`NODE_ENV=production` or `OR3_STRICT_CONFIG=true`), startup fails intentionally.
  - In development, set `OR3_BASIC_AUTH_ALLOW_INSECURE_DEV=true` to start with registration disabled instead.
  - Add the missing secret(s) and restart.

- `Invalid credentials` on known user
  - Verify the bootstrap account values.
  - Confirm password updates were propagated after recent `change-password` calls.

- `Session expired` during refresh
  - Refresh token may be revoked/rotated/replayed.
  - Sign in again to create a new session chain.

## Intern quick start

Implementation order used in this package:

1. `src/runtime/server/lib/password.ts`
2. `src/runtime/server/lib/jwt.ts`
3. `src/runtime/server/db/client.ts` and `src/runtime/server/lib/session-store.ts`
4. `src/runtime/server/api/basic-auth/*.post.ts`
5. `src/runtime/server/auth/basic-auth-provider.ts`
6. `src/runtime/server/plugins/register.ts`
7. `src/runtime/components/*.client.vue` and `src/runtime/plugins/basic-auth-ui.client.ts`
8. `src/runtime/**/__tests__/*.test.ts`

## Scripts

```bash
bun run type-check
bun run test
bun run build
```
