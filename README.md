# or3-provider-basic-auth

Basic-auth provider for OR3 Chat SSR mode.

This package registers:

- `AuthProvider` (`basic-auth`)
- `ProviderTokenBroker` (`basic-auth`)
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

- `AUTH_PROVIDER=basic-auth`
- `OR3_BASIC_AUTH_JWT_SECRET`

Optional:

- `OR3_BASIC_AUTH_REFRESH_SECRET` (falls back to `OR3_BASIC_AUTH_JWT_SECRET`)
- `OR3_BASIC_AUTH_ACCESS_TTL_SECONDS` (default `900`)
- `OR3_BASIC_AUTH_REFRESH_TTL_SECONDS` (default `2592000`)
- `OR3_BASIC_AUTH_DB_PATH` (default `./.data/or3-basic-auth.sqlite`)
- `OR3_BASIC_AUTH_BOOTSTRAP_EMAIL`
- `OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD`

Strict-mode behavior:

- `NODE_ENV=production` or `OR3_STRICT_CONFIG=true` fails startup if required secrets are missing.
- non-strict mode logs diagnostics and leaves provider registration disabled.

## Architecture notes

- Credentials/session state is stored in a provider-owned SQLite DB.
- Canonical OR3 users/workspaces are still resolved by the selected `AuthWorkspaceStore`.
- Access JWTs are short-lived and validated by `basicAuthProvider.getSession(event)`.
- Refresh tokens are rotated and hashed at rest; replay attempts revoke active sessions.

## Troubleshooting

- `Authentication provider is not configured`
  - Ensure `AUTH_PROVIDER=basic-auth` and `SSR_AUTH_ENABLED=true`.
  - Ensure `OR3_BASIC_AUTH_JWT_SECRET` is set.

- `Missing OR3_BASIC_AUTH_JWT_SECRET`
  - In strict mode (`NODE_ENV=production` or `OR3_STRICT_CONFIG=true`), startup fails intentionally.
  - Add the missing secret and restart.

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
