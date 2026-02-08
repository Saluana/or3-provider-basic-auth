# tasks.md

artifact_id: 9627aa2e-7c51-479a-be3f-53a2dd95a667

## 0. Preflight

- [ ] Confirm package root and Bun toolchain setup
  - Requirements: 1.1
- [ ] Add minimal package metadata (`name`, `exports`, scripts)
  - Requirements: 1.1
- [ ] Add README placeholder and architecture notes
  - Requirements: 7.1

## 1. Package Scaffolding

- [ ] Create `src/module.ts` with Nuxt module entry
  - Requirements: 1.1, 1.2
- [ ] Create runtime folders (`server`, `plugins`, `components`, `db`, `lib`)
  - Requirements: 1.2
- [ ] Add `tsconfig.json` and Bun scripts (`build`, `type-check`, `test`)
  - Requirements: 1.1, 6.1

## 2. Server Auth Core

### 2.1 Security primitives

- [ ] Implement password hashing helpers (`hashPassword`, `verifyPassword`)
  - Requirements: 3.1
- [ ] Implement JWT signing/verification helpers for access + refresh
  - Requirements: 2.2, 3.2
- [ ] Implement cookie helpers for set/clear and env-aware flags
  - Requirements: 3.2

### 2.2 Session persistence

- [ ] Implement provider-owned auth DB client and schema migrations
  - Requirements: 2.2, 3.1
- [ ] Implement account/session repository functions
  - Requirements: 2.2, 3.1
- [ ] Add rotation/replay detection in refresh logic
  - Requirements: 2.2, 6.1

### 2.3 AuthProvider + broker

- [ ] Implement `basicAuthProvider.getSession(event)`
  - Requirements: 2.1, 4.1
- [ ] Implement `BasicAuthTokenBroker`
  - Requirements: 1.2, 4.1
- [ ] Implement Nitro registration plugin (`register.ts`)
  - Requirements: 1.2

## 3. Auth Endpoints

- [ ] Implement `sign-in.post.ts`
  - Requirements: 2.1, 3.3
- [ ] Implement `refresh.post.ts`
  - Requirements: 2.2, 3.3
- [ ] Implement `sign-out.post.ts`
  - Requirements: 2.1
- [ ] Implement `change-password.post.ts`
  - Requirements: 2.3, 3.3
- [ ] Add request validation schemas for all endpoints
  - Requirements: 3.3
- [ ] Add error normalization (no user enumeration)
  - Requirements: 3.3

## 4. Client UI Adapter

- [ ] Implement `SidebarAuthButtonBasic.client.vue`
  - Requirements: 4.2
- [ ] Implement `BasicAuthSignInModal.client.vue`
  - Requirements: 2.1, 4.2
- [ ] Implement `BasicAuthUserMenu.client.vue`
  - Requirements: 2.1, 4.2
- [ ] Implement `BasicAuthChangePasswordModal.client.vue`
  - Requirements: 2.3, 4.2
- [ ] Register adapter in `basic-auth-ui.client.ts`
  - Requirements: 1.2, 4.2

## 5. Configuration and Validation

- [ ] Add env parsing helpers and defaults
  - Requirements: 5.1
- [ ] Add strict-mode missing-secret validation
  - Requirements: 5.2
- [ ] Add startup diagnostics for invalid auth config
  - Requirements: 5.2

## 6. Testing

### 6.1 Unit tests

- [ ] Password hash/verify tests
  - Requirements: 6.1
- [ ] JWT sign/verify/expiry tests
  - Requirements: 6.1
- [ ] Session store rotation/replay tests
  - Requirements: 6.1

### 6.2 Integration tests

- [ ] Registration test (`AuthProvider` and broker present)
  - Requirements: 6.2
- [ ] Sign-in -> session resolution test
  - Requirements: 2.1, 6.2
- [ ] Refresh rotation flow test
  - Requirements: 2.2, 6.2
- [ ] Change-password invalidates prior sessions test
  - Requirements: 2.3, 6.2

### 6.3 UI tests

- [ ] Signed-out state renders login path
  - Requirements: 4.2, 6.3
- [ ] Signed-in state renders user menu and logout path
  - Requirements: 4.2, 6.3
- [ ] Change-password modal happy path and error path
  - Requirements: 2.3, 6.3

## 7. Documentation and Final Verification

- [ ] Complete README install/setup/troubleshooting sections
  - Requirements: 7.1
- [ ] Add quick start for intern implementation order
  - Requirements: 7.2
- [ ] Run provider tests, type-check, and build from provider root
  - Requirements: 6.1, 6.2

