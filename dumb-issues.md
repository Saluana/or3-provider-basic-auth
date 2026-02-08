## Refresh flow is basically dead code

**Location:**
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/auth/basic-auth-provider.ts:30-38`
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/components/SidebarAuthButtonBasic.client.vue:47-52`

**Why this is bad:**
`getSession()` bails out as soon as the access token is missing/invalid and never attempts refresh-token recovery. The client sidebar only calls `/api/auth/session`, not `/api/basic-auth/refresh`, so once access expires you are effectively signed out even with a valid refresh cookie.

**Real-world consequence:**
Users get surprise logouts every access TTL window (default 15 minutes). That directly violates the “persistent sessions” requirement and creates churn/support noise.

**Concrete fix:**
Implement transparent refresh fallback when access token is invalid. Either:
1. in `getSession(event)`, attempt refresh-cookie verification + rotation + new access cookie set before returning `null`; or
2. add a client refresh bridge that calls `/api/basic-auth/refresh` on session-miss and retries `/api/auth/session`.

---

## Your rate limiter leaks memory forever

**Location:**
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/lib/rate-limit.ts:21`
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/lib/rate-limit.ts:68-70`

**Why this is bad:**
The limiter uses a plain `Map` keyed by subject+operation and never evicts stale keys. You prune timestamps per key, but never remove old keys themselves. An attacker can spray random source IPs and force unbounded map growth.

**Real-world consequence:**
Long-running instances accumulate garbage keys and memory grows without bound. Under abuse traffic, this becomes a memory pressure DoS.

**Concrete fix:**
Use an LRU/TTL-backed store (`lru-cache`, same pattern as OR3 server rate limit modules) and expire idle keys automatically.

---

## Proxy handling is inconsistent with core and ignores configured headers

**Location:**
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/lib/rate-limit.ts:24-31`
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/lib/request-security.ts:16-24`

**Why this is bad:**
You hardcode `x-forwarded-for` and `x-forwarded-host` instead of using OR3’s existing `normalizeProxyTrustConfig` + request identity helpers. If an instance uses non-default proxy header config, auth rate limits and origin checks use the wrong identity/host data.

**Real-world consequence:**
False 403s, incorrect per-client throttling, and unpredictable behavior in real reverse-proxy deployments.

**Concrete fix:**
Replace custom header parsing with shared core helpers:
- `~~/server/utils/net/request-identity`
- `~~/server/utils/normalize-host`

This keeps auth behavior aligned with the rest of OR3 server stack.

---

## Type safety is fake at the integration boundary

**Location:**
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/auth/basic-auth-provider.ts:10-24`
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/shims/server-auth-registry.d.ts:1-6`
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/shims/server-auth-token-broker-registry.d.ts:1-5`

**Why this is bad:**
You replaced real host contracts (`AuthProvider`, broker registry types) with local ad-hoc interfaces and `unknown`-ish shims. This compiles, but decouples provider correctness from host contract changes. Type-check green no longer means runtime compatibility.

**Real-world consequence:**
Core can change contract shape and this provider still “passes” type-check, then breaks at runtime during registration/session resolution.

**Concrete fix:**
Type against real host contracts during CI/type-check (shared types package or workspace type-check mode), and stop using loose local contract substitutes for production interfaces.

---

## JWT verification is missing explicit algorithm constraints

**Location:**
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/lib/jwt.ts:97`
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/lib/jwt.ts:108`

**Why this is bad:**
`jwt.verify()` is called without an explicit `algorithms` allowlist. You’re relying on library defaults. That is lazy security posture and brittle if defaults change.

**Real-world consequence:**
You widen the blast radius for token validation mistakes and make security posture depend on transitive library behavior.

**Concrete fix:**
Pin verification algorithms explicitly:
```ts
jwt.verify(token, secret, { algorithms: ['HS256'] })
```
Also set `algorithm: 'HS256'` explicitly in `jwt.sign()` options.

---

## Startup does expensive bcrypt work even when it doesn’t need to

**Location:**
- `/Users/brendon/Documents/or3/or3-provider-basic-auth/src/runtime/server/plugins/register.ts:19-24`

**Why this is bad:**
Bootstrap logic hashes the bootstrap password every startup before confirming whether the account already exists. Bcrypt cost 12 on every boot for no state change is wasteful and dumb.

**Real-world consequence:**
Slower cold starts/restarts, unnecessary CPU burn, and noisier autoscaling behavior.

**Concrete fix:**
Check for existing account first, only hash and insert when absent. Do not run adaptive hash work on the hot startup path when no write is needed.
