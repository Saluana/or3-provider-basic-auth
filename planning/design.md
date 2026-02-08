# design.md

artifact_id: 73a17e70-1d18-4be6-a106-962db1ebf438

## Overview

`or3-provider-basic-auth` is an auth-only provider package for OR3 Cloud SSR mode.

It plugs into core by registering:

- `AuthProvider` (`basic-auth`)
- `ProviderTokenBroker` (`basic-auth`)
- provider auth UI adapter for sidebar/account controls

It does **not** replace the canonical workspace/user store backend; that remains the selected sync provider (`AuthWorkspaceStore`).

## Architecture

```mermaid
flowchart LR
  Browser --> SignIn[/api/basic-auth/sign-in]
  Browser --> Refresh[/api/basic-auth/refresh]
  Browser --> SignOut[/api/basic-auth/sign-out]
  Browser --> ChangePw[/api/basic-auth/change-password]

  Session[/api/auth/session] --> Provider[BasicAuthProvider.getSession]
  Provider --> JwtVerify[Access JWT Verify]
  Session --> WorkspaceStore[Configured AuthWorkspaceStore]

  Register[Nitro Plugin register.ts] --> AuthRegistry[registerAuthProvider]
  Register --> BrokerRegistry[registerProviderTokenBroker]
  ClientPlugin[basic-auth-ui.client.ts] --> AuthUiRegistry[registerAuthUiAdapter]
```

## Package Layout

```text
or3-provider-basic-auth/
  package.json
  tsconfig.json
  README.md
  src/
    module.ts
    runtime/
      plugins/
        basic-auth-ui.client.ts
      components/
        SidebarAuthButtonBasic.client.vue
        BasicAuthSignInModal.client.vue
        BasicAuthUserMenu.client.vue
        BasicAuthChangePasswordModal.client.vue
      server/
        plugins/
          register.ts
        auth/
          basic-auth-provider.ts
        token-broker/
          basic-auth-token-broker.ts
        api/basic-auth/
          sign-in.post.ts
          sign-out.post.ts
          refresh.post.ts
          change-password.post.ts
        lib/
          cookies.ts
          jwt.ts
          password.ts
          session-store.ts
          rate-limit.ts
        db/
          schema.ts
          client.ts
```

## Interfaces and Integration

### AuthProvider implementation

```ts
// src/runtime/server/auth/basic-auth-provider.ts
import type { H3Event } from 'h3';
import type { AuthProvider, ProviderSession } from '~~/server/auth/types';
import { verifyAccessTokenFromEvent } from '../lib/jwt';

export const basicAuthProvider: AuthProvider = {
  name: 'basic-auth',

  async getSession(event: H3Event): Promise<ProviderSession | null> {
    const token = verifyAccessTokenFromEvent(event);
    if (!token) return null;

    return {
      provider: 'basic-auth',
      user: {
        id: token.sub,
        email: token.email,
        displayName: token.display_name,
      },
      expiresAt: new Date(token.exp * 1000),
      claims: token,
    };
  },
};
```

### ProviderTokenBroker implementation

```ts
// src/runtime/server/token-broker/basic-auth-token-broker.ts
import type { H3Event } from 'h3';
import type { ProviderTokenBroker } from '~~/server/auth/token-broker/types';

export class BasicAuthTokenBroker implements ProviderTokenBroker {
  async getProviderToken(_event: H3Event, input: { providerId: string; template?: string }) {
    // v1: no provider-specific token templates. Return null explicitly.
    // Future: sign scoped downstream provider JWTs if needed.
    void input;
    return null;
  }
}

export function createBasicAuthTokenBroker() {
  return new BasicAuthTokenBroker();
}
```

### Nitro registration plugin

```ts
// src/runtime/server/plugins/register.ts
import { registerAuthProvider } from '~~/server/auth/registry';
import { registerProviderTokenBroker } from '~~/server/auth/token-broker/registry';
import { basicAuthProvider } from '../auth/basic-auth-provider';
import { createBasicAuthTokenBroker } from '../token-broker/basic-auth-token-broker';

export default defineNitroPlugin(() => {
  registerAuthProvider({
    id: 'basic-auth',
    order: 100,
    create: () => basicAuthProvider,
  });

  registerProviderTokenBroker('basic-auth', createBasicAuthTokenBroker);
});
```

### Nuxt module

```ts
// src/module.ts
import { defineNuxtModule, addServerPlugin, addServerHandler, addPlugin, createResolver } from '@nuxt/kit';

export default defineNuxtModule({
  meta: { name: 'or3-provider-basic-auth' },
  setup() {
    const { resolve } = createResolver(import.meta.url);

    addServerPlugin(resolve('runtime/server/plugins/register'));

    addServerHandler({ route: '/api/basic-auth/sign-in', method: 'post', handler: resolve('runtime/server/api/basic-auth/sign-in.post') });
    addServerHandler({ route: '/api/basic-auth/sign-out', method: 'post', handler: resolve('runtime/server/api/basic-auth/sign-out.post') });
    addServerHandler({ route: '/api/basic-auth/refresh', method: 'post', handler: resolve('runtime/server/api/basic-auth/refresh.post') });
    addServerHandler({ route: '/api/basic-auth/change-password', method: 'post', handler: resolve('runtime/server/api/basic-auth/change-password.post') });

    addPlugin(resolve('runtime/plugins/basic-auth-ui.client'), { append: true });
  },
});
```

## Data Model (Provider-owned Auth DB)

Use a small provider-local DB for auth-only state.

```ts
// src/runtime/server/db/schema.ts
export interface BasicAuthAccount {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  token_version: number;
  created_at: number;
  updated_at: number;
}

export interface BasicAuthSession {
  id: string; // sid
  account_id: string;
  refresh_token_hash: string;
  expires_at: number;
  revoked_at: number | null;
  created_at: number;
  rotated_from_session_id: string | null;
}
```

Notes:

- `token_version` supports hard revocation after password changes.
- refresh tokens are hashed at rest.
- this DB does not store OR3 workspace memberships.

## Endpoint Flow

### `POST /api/basic-auth/sign-in`

1. Validate input (`email`, `password`).
2. Fetch account by normalized email.
3. Verify password hash.
4. Create new session row (`sid`, hashed refresh token).
5. Mint access JWT + set cookies.
6. Return `{ ok: true }`.

### `POST /api/basic-auth/refresh`

1. Read refresh cookie.
2. Verify refresh token signature + session lookup by hash.
3. Reject if session revoked/expired.
4. Rotate session and refresh token.
5. Mint new access token.
6. Set cookies and return `{ ok: true }`.

### `POST /api/basic-auth/sign-out`

1. Read current session.
2. Revoke matching refresh session row.
3. Clear access/refresh cookies.
4. Return `{ ok: true }`.

### `POST /api/basic-auth/change-password`

1. Require authenticated session.
2. Validate current password.
3. Hash and store new password.
4. Increment `token_version` and revoke sessions per policy.
5. Return `{ ok: true }`.

## Security Design

### Password hashing

```ts
// src/runtime/server/lib/password.ts
import bcrypt from 'bcryptjs';

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### JWT handling

```ts
// src/runtime/server/lib/jwt.ts
import jwt from 'jsonwebtoken';

export function signAccessToken(payload: { sub: string; email: string; display_name?: string | null; sid: string; ver: number }) {
  const secret = process.env.OR3_BASIC_AUTH_JWT_SECRET;
  if (!secret) throw new Error('Missing OR3_BASIC_AUTH_JWT_SECRET');

  return jwt.sign(payload, secret, { expiresIn: process.env.OR3_BASIC_AUTH_ACCESS_TTL_SECONDS ?? '900s' });
}
```

### Cookie policy

- `or3_access`: HttpOnly, SameSite=Lax, Secure(prod), Path=/.
- `or3_refresh`: HttpOnly, SameSite=Lax, Secure(prod), Path=/api/basic-auth.

## UI Adapter Design

### Adapter plugin

```ts
// src/runtime/plugins/basic-auth-ui.client.ts
import { registerAuthUiAdapter } from '~~/app/core/auth-ui/registry';
import SidebarAuthButtonBasic from '../components/SidebarAuthButtonBasic.client.vue';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  if (!config.public.ssrAuthEnabled) return;

  registerAuthUiAdapter({
    id: 'basic-auth',
    component: SidebarAuthButtonBasic,
  });
});
```

### UI behavior

- signed-out: show Login button -> opens sign-in modal.
- signed-in: show user icon/button -> popover with change password + logout.
- respects existing Nuxt UI design tokens and retro button variants.

## Error Handling

- `401` for invalid credentials or invalid tokens.
- `429` for endpoint throttling.
- generic messages only (`Invalid credentials`, `Session expired`).
- never return whether email exists.

## Testing Strategy

### Unit tests

- `password.test.ts`: hash/verify behavior.
- `jwt.test.ts`: sign/verify, expiry, invalid signature.
- `session-store.test.ts`: rotation/replay/revocation.

### Integration tests

- registration plugin wires `AuthProvider` + broker.
- sign-in -> `/api/auth/session` authenticated.
- refresh rotates tokens and invalidates old refresh token.
- change password invalidates older access claims via `token_version`.

### UI tests

- modal open/close and submit paths.
- signed-in vs signed-out states.
- logout clears client session context after server sign-out.

## Implementation Notes for Intern

1. Build the server auth primitives first (`password.ts`, `jwt.ts`, `session-store.ts`).
2. Implement endpoints with strict input validation.
3. Register provider in Nitro plugin and verify `/api/auth/session` path.
4. Build UI adapter components last.
5. Add tests per module before wiring next layer.

