# requirements.md

artifact_id: 3d57d566-cebd-4d79-9cdd-63bea40f2607

## Overview

Build `or3-provider-basic-auth` as a provider-only package that supplies SSR authentication without Clerk.

Scope is limited to auth provider concerns:

- `AuthProvider` registration and session resolution
- `ProviderTokenBroker` registration
- secure password-based auth flows (sign in/sign out/refresh/change password)
- provider-owned auth UI components used by core auth UI adapter

This provider must integrate with the existing OR3 registries and preserve core authorization behavior (`can()` remains the only authorization gate).

## Roles

- End User: logs in, logs out, and changes password.
- Instance Operator: configures auth env vars and manages initial user bootstrap.
- OR3 Maintainer: ships provider with stable package entry and tests.

## Requirements

### 1. Package and Registration

1.1 As a Maintainer, I want this provider to be installable as `or3-provider-basic-auth`, so that it can be selected through cloud config without core edits.

- WHEN package is installed THEN it SHALL expose `or3-provider-basic-auth/nuxt`.
- WHEN module loads THEN it SHALL register auth surfaces through existing registries.
- Provider SHALL not require Clerk or Convex dependencies.

1.2 As a Maintainer, I want deterministic registration behavior, so that provider startup is predictable.

- Provider SHALL register `AuthProvider` with ID `basic-auth`.
- Provider SHALL register `ProviderTokenBroker` with ID `basic-auth`.
- Provider SHALL register auth UI adapter in client plugin.

### 2. Session and Authentication Flow

2.1 As an End User, I want password login, so that I can authenticate without third-party auth.

- WHEN valid email/password is submitted THEN sign-in SHALL create an authenticated server session.
- WHEN credentials are invalid THEN sign-in SHALL return an auth-safe error.
- WHEN user signs out THEN server session SHALL be revoked and cookies cleared.

2.2 As an End User, I want persistent sessions, so that I stay signed in without frequent re-login.

- Provider SHALL issue short-lived access tokens and long-lived refresh tokens.
- Provider SHALL implement refresh endpoint and token rotation.
- Refresh reuse/replay SHALL be detected and rejected.

2.3 As an End User, I want to change my password, so that I can manage account security.

- WHEN current password is valid THEN password SHALL be updated with secure hash.
- WHEN password changes THEN old sessions SHALL be revoked per policy.
- Errors SHALL not leak stored hash details.

### 3. Security

3.1 As a Security Reviewer, I want secure credential handling, so that stored secrets remain protected.

- Passwords SHALL be hashed using strong adaptive hash.
- Plaintext passwords SHALL never be stored or logged.
- Token secrets SHALL be read from server-only env vars.

3.2 As a Security Reviewer, I want secure cookie/token behavior, so that session theft risk is minimized.

- Access and refresh cookies SHALL be `HttpOnly` and `SameSite=Lax`.
- Cookies SHALL be `Secure` in production.
- Access tokens SHALL be short-lived (default <= 15 minutes).

3.3 As a Security Reviewer, I want endpoint hardening, so that auth endpoints resist common abuse.

- Sign-in/refresh/change-password SHALL enforce basic rate limiting hooks.
- Mutation endpoints SHALL enforce origin/same-site protections.
- All auth errors SHALL be generic and non-enumerating.

### 4. Integration with OR3 Core

4.1 As a Systems Engineer, I want provider compatibility with existing session resolver, so that core auth flow stays unchanged.

- `resolveSessionContext()` SHALL work using this provider’s `getSession(event)`.
- Workspace resolution SHALL continue via selected `AuthWorkspaceStore` (provider does not replace canonical workspace store).
- `can()` authorization SHALL be unchanged.

4.2 As a Frontend Maintainer, I want provider-owned auth UI, so that no Clerk-specific component warnings appear.

- Provider SHALL expose components for:
  - signed-in account button/popover
  - signed-out login trigger/modal
  - change-password modal
- UI SHALL render only when `auth.provider === 'basic-auth'`.

### 5. Configuration and Operability

5.1 As an Operator, I want explicit env configuration, so that setup is straightforward.

- Provider SHALL document required env vars:
  - `OR3_BASIC_AUTH_JWT_SECRET`
  - `OR3_BASIC_AUTH_REFRESH_SECRET` (or fallback strategy)
  - token TTL env vars
  - optional auth DB path

5.2 As an Operator, I want safe startup behavior, so that misconfiguration fails clearly.

- Missing required secrets in strict mode SHALL fail startup with actionable error messages.
- Non-strict mode SHALL warn clearly and keep auth disabled/failing-safe.

### 6. Testing

6.1 As a Maintainer, I want unit coverage for auth primitives, so that regressions are caught early.

- Unit tests SHALL cover hash/verify, token mint/verify, expiry handling, refresh rotation, replay rejection.

6.2 As a Maintainer, I want integration coverage for provider registration and endpoints, so that wiring is validated.

- Integration tests SHALL cover module registration, auth session resolution, sign-in/sign-out/refresh/change-password flows.

6.3 As a Maintainer, I want UI tests for provider auth components, so that core auth surfaces remain usable.

- Tests SHALL verify signed-in vs signed-out render behavior and modal interactions.

### 7. Documentation

7.1 As an Operator, I want a provider-specific setup guide, so that install and troubleshooting are clear.

- Docs SHALL include install steps, env vars, runtime registrations, and common failure cases.

7.2 As an Intern, I want implementation notes with file map and code examples, so that onboarding is fast.

- Design doc SHALL include concrete starter code and package layout.

