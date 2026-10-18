# or3-provider-basic-auth

Basic-auth provider for OR3 Chat SSR mode.

This package registers:

- `AuthProvider` (`basic-auth`)
- `ProviderTokenBroker` (`basic-auth`)
- admin status adapter (`auth-basic-auth`)
- provider-owned auth UI adapter + components
- Client status and silent-refresh recovery adapters activate only while SSR auth is enabled and Basic Auth is selected; inactive modules preserve the active auth provider's adapters.

## Lock page UI

The lock-page adapter uses an email-first form: **Continue with email** opens
registration with the address filled in, and **Existing account? Sign in** opens
the password sign-in dialog. When the host's public `registrationMode` is
`disabled`, Continue opens sign-in instead. Invite-only registration continues to
require a valid invite, and invite links retain their automatic registration
handoff. No account is created until the registration dialog is submitted.

`BasicAuthSignInModal` and `BasicAuthRegisterModal` accept an optional
`initialEmail` prop, applied when the dialog opens. Existing callers can omit it.
The registered lock-page component also exposes an optional `email-form` slot
with `{ state }` (`state.email` is writable). A trusted host extension can replace
the primary email form while retaining the provider's sign-in and registration
dialogs. When an invite token is present, the provider always uses its original
form and automatic invite handoff, regardless of the slot. With no slot, behavior
is unchanged. This slot requires rebuilding/upgrading the provider.
The OR3 host supplies the branded preview, logo, headline, and responsive layout,
including lightweight WebP sky scenes, handwritten captions, and an overlapping
mobile sign-in card that adapts to screen height. The host footer links to
`https://or3.net` (Learn more) and `https://github.com/Saluana/or3-chat` (GitHub)
in new tabs. The mobile email label remains
accessible while the field displays an envelope icon and placeholder. Custom adapters
continue to own the full page. This UI requires rebuilding the provider and host;
published installations need a provider release and updated host pin.

The host handles session-check failures with retry controls and explains denied
workspace access for authenticated accounts. Safe post-authentication redirects
retain query strings and fragments and reject destinations back to the lock page.

The registration dialog uses the host's configured branding and theme colors,
with the welcoming birds perched on a cloud bank in the card's top-right corner,
a cloud strip along the footer, labeled icon fields, and inline sign-in and
account actions. Day and night versions of the artwork follow the host's `.dark`
class. On small screens the illustration stays a compact top-right accent, the
card scrolls, and the actions fill the available width. Decorative images are
excluded from the accessibility tree; the dialog keeps its accessible title,
description, focus handling, and existing validation and invite handoff. The
four WebP assets ship inside the provider's runtime and only the active mode's
pair is loaded, so no external image service is required. Rebuild
the provider for local source development; published installations require an
updated provider version.

<details>
<summary>Registration artwork generation prompts</summary>

Four independent generations with the built-in imagegen tool, each using only
the original modal mockup as its reference; no earlier artwork was used as input,
so the night versions are similar to, not pixel-aligned with, the day versions.
The prompts requested a 2304×1536 canvas, but the tool returned 1536×1024
transparent PNGs. Each was cropped to its artwork and encoded as WebP with alpha
using `cwebp -q 84 -alpha_q 95 -m 6 -sharp_yuv` (hero: `-crop 300 0 1236 1024
-resize 760 0`; footer: `-crop 0 660 1536 364 -resize 1408 0`). Assets:
`src/runtime/assets/signup-hero-{light,dark}.webp` and
`src/runtime/assets/signup-clouds-bottom-{light,dark}.webp`. Both heroes keep the
birds within the top 72% of the image; the modal fades only the cloud below that.

**Hero, day**

```text
Use case: stylized-concept. Generate a NEW high-resolution standalone illustration, using ONLY the attached mockup as the visual reference. Reconstruct the small decorative birds-and-clouds scene at the UPPER RIGHT OF THE WHITE MODAL faithfully at much higher quality. This is reference-based new generation, not an edit of any earlier generated asset.
Output: 2304×1536 landscape PNG with a truly transparent background.

Match the reference's characters, silhouettes, proportions and poses: the sage-green hummingbird is on the left and slightly behind, with a cream belly, a long slender dark beak pointing diagonally UPPER LEFT, an excited open orange mouth, a small rounded feather crest sweeping right and an open fan-shaped wing on the left. The smaller cobalt-blue chick is on the right in front, facing slightly up-left toward the viewer, with a short orange open beak, cream chest, compact swept crest and a little extended wing to the right. Use the mockup's charming compact, softly rounded 3D animation style with a subtle matte velvety finish and clear eyes. Preserve their appealing simple anatomy; fine detail should clarify the reference rather than redesign it. Add the same small green chirp marks beside the hummingbird.

The birds nestle into the same soft white cloud bank shown in the mockup, partly hidden at the belly. Clouds have broad smooth blended lobes, very pale cyan shading and diffuse daylight, with soft edges. Keep the reference's clean, restrained cloud forms: neither separate spherical balls nor detailed storm-cloud texture. The bank extends off the TOP and RIGHT edges. At left and bottom it softly dissipates to real alpha transparency. Keep the entire group in the right two-thirds of the canvas, the left third mostly transparent, and the upper-right small corner clear of birds for the app's close control.
Only recreate that upper-right artwork. Do not include the modal, logo, text, controls, background webpage or the separate birds in a nest at the bottom-left of the screenshot. No isolated cloud dots, bubbles, glossy spheres, long fur, grainy vapor or fractal cloud texture. No background rectangle or sky fill.
```

**Footer clouds, day**

```text
Use case: stylized-concept. Generate a NEW high-resolution transparent cloud-edge asset using ONLY the attached original UI mockup as the reference. Reconstruct the QUIET CLOUD EDGING AT THE VERY BOTTOM OF THE WHITE MODAL, faithfully and at much higher quality. This is fresh reference-based generation, not an edit of earlier generated clouds.
Output: 2304×1536 landscape PNG, true alpha transparency.

Match the reference's very soft, simple stylized 3D clouds: broad gently merged white cloud masses with faint pale-cyan shading, diffuse daylight and softly feathered edges. A few overlapping smooth puffs of varied size make a low cloud cluster at the bottom-left and a slightly taller cluster at the bottom-right; the middle stays almost empty with only a faint low haze along the bottom. Keep this airy and restrained like the mockup, leaving generous negative space for the form. Confine all visible cloud masses to the bottom quarter of the canvas; upper three-quarters fully transparent. Run the clouds off left, right and bottom edges. The cloud tops dissolve softly into alpha. Recreate the broad reference forms without adding visual detail the mockup does not have.

No birds, nest, text, logo, green marks, buttons, interface, or background webpage. No separated spheres, balls, bubbles, bead-like dots, shiny highlights, dense towering clouds, realistic weather texture, fur or fractal cotton. No sky or white background fill; the surrounding canvas is truly transparent.
```

**Hero, night**

```text
Use case: stylized-concept. Generate a NEW high-resolution standalone illustration, using ONLY the attached mockup as the visual reference. Reconstruct the small decorative birds-and-clouds scene at the UPPER RIGHT OF THE WHITE MODAL faithfully at much higher quality. This is reference-based new generation, not an edit of any earlier generated asset.
Output: 2304×1536 landscape PNG with a truly transparent background.

Create a calm NIGHT-MODE counterpart directly from the mockup reference. Match the reference's characters, silhouettes, proportions and poses: the sage-green hummingbird is on the left and slightly behind, with a cream belly, a long slender dark beak pointing diagonally UPPER LEFT, an excited open orange mouth, a small rounded feather crest sweeping right and an open fan-shaped wing on the left. The smaller cobalt-blue chick is on the right in front, facing slightly up-left toward the viewer, with a short orange open beak, cream chest, compact swept crest and a little extended wing to the right. Use the mockup's charming compact, softly rounded 3D animation style with a subtle matte velvety finish and clear eyes. Preserve their appealing simple anatomy; fine detail should clarify the reference rather than redesign it. Add the same small green chirp marks beside the hummingbird.

The birds nestle into the same soft slate-blue cloud bank shown in the mockup, partly hidden at the belly. Clouds have broad smooth blended lobes, low-contrast slate-blue bodies (#1f2f4a to #2c4166) and diffuse cool moonlight, with soft edges. Keep the reference's clean, restrained cloud forms: neither separate spherical balls nor detailed storm-cloud texture. The bank extends off the TOP and RIGHT edges. At left and bottom it softly dissipates to real alpha transparency. Keep the entire group in the right two-thirds of the canvas, the left third mostly transparent, and the upper-right small corner clear of birds for the app's close control.
Only recreate that upper-right artwork. Do not include the modal, logo, text, controls, background webpage or the separate birds in a nest at the bottom-left of the screenshot. No isolated cloud dots, bubbles, glossy spheres, long fur, grainy vapor or fractal cloud texture. No background rectangle or sky fill.
Night lighting is a broad gentle gradient across the cloud bank, subtly lighter on upper surfaces, darker below. Preserve each bird's natural sage-green, cobalt-blue, cream and orange colours under soft cool illumination so both stay readable and vivid. No bright moonlit rims, no glowing outlines around puffs, no stars, no navy background fill. Keep the same compact character poses and smooth, simple cloud treatment as the original mockup.
```

**Footer clouds, night**

```text
Use case: stylized-concept. Generate a NEW high-resolution transparent cloud-edge asset using ONLY the attached original UI mockup as the reference. Reconstruct the QUIET CLOUD EDGING AT THE VERY BOTTOM OF THE WHITE MODAL, faithfully and at much higher quality. This is fresh reference-based generation, not an edit of earlier generated clouds.
Output: 2304×1536 landscape PNG, true alpha transparency.

Create a calm NIGHT-MODE counterpart directly from the mockup reference. Match the reference's very soft, simple stylized 3D clouds: broad gently merged slate-blue cloud masses (#1f2f4a to #2c4166) with subtle diffuse moonlight and softly feathered edges. A few overlapping smooth puffs of varied size make a low cloud cluster at the bottom-left and a slightly taller cluster at the bottom-right; the middle stays almost empty with only a faint low haze along the bottom. Keep this airy and restrained like the mockup, leaving generous negative space for the form. Confine all visible cloud masses to the bottom quarter of the canvas; upper three-quarters fully transparent. Run the clouds off left, right and bottom edges. The cloud tops dissolve softly into alpha. Recreate the broad reference forms without adding visual detail the mockup does not have.

No birds, nest, text, logo, green marks, buttons, interface, or background webpage. No separated spheres, balls, bubbles, bead-like dots, shiny highlights, dense towering clouds, realistic weather texture, fur or fractal cotton. No sky or white background fill; the surrounding canvas is truly transparent.
Use a gentle broad lighting gradient that is slightly lighter on cloud tops and darker underneath. The cloud edging stays quiet and low contrast. No bright rim light, no white/glowing contour lines around individual puffs, no stars, and no black or navy background fill. Upper negative space remains true alpha transparency.
```

</details>

## Sign-in dialog

The sign-in dialog welcomes returning users with **Welcome back** and **Pick up
where you left off.**, the configured site logo, and a blue bird seated in clouds.
It matches the registration dialog's 44rem maximum width and responsive control
sizes, with labeled email/password fields and icons, an inline
**Don’t have an account? Create account** action, and Cancel/Sign in buttons. The
card adapts to short screens and phones, with keyboard focus and accessible error
announcements. Email prefilling, invitation forwarding and credential submission
keep their existing behavior.

Day/night hero illustrations were generated independently with the built-in
imagegen tool directly from the sign-in mockup. The originals are 1536×1024
transparent PNGs; the shipped `signin-hero-{light,dark}.webp` files are 1200×800,
encoded with `cwebp -q 84 -alpha_q 95 -m 6 -sharp_yuv -resize 1200 0`. The footer
reuses the registration cloud edging. Only the active theme's artwork loads, and
all illustration is decorative. Rebuild the provider to see source changes;
published installations require an updated provider release.

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
- `OR3_PLUGIN_DEV_COOKIE_SCOPE` (set by the isolated plugin development launcher to keep browser sessions separate across local hosts)

Registration mode is a core-auth policy, not a provider setting:

- `OR3_AUTH_REGISTRATION_MODE=open|invite_only|disabled`
- `OR3_AUTH_INVITE_TOKEN_SECRET` and `OR3_AUTH_INVITE_TOKEN_TTL_SECONDS` (required for `invite_only`)

Creating invitations also requires `OR3_AUTH_INVITE_TOKEN_SECRET` in open
registration mode. When it is missing, **Admin → Registration → Invitations** explains how
to set it and restart OR3, with a link to the host's
`/documentation/cloud/environment-reference#invite-signing-setup` guide. No
invitation is created until the secret is configured.

The host's **Admin → Registration** page groups **Settings** and **Invitations**.
Settings saves open, invite-only, or closed registration to
`OR3_AUTH_REGISTRATION_MODE` in the server's `.env` and distinguishes the saved
mode from the current mode until OR3 restarts. The restart notice offers
**Restart now** with confirmation when the owner has dashboard restart access
(`OR3_ADMIN_ALLOW_RESTART=true`); development servers need a manual restart.
Reload after the server returns to check the active mode. It also reports
invitation setup status and prevents saving invite-only mode without the configured signing
secret. Creating, copying, viewing, and revoking signup invites live in the
Invitations tab; the old `/admin/signup-invites` link redirects there.

Strict-mode behavior:

- `NODE_ENV=production`, `OR3_STRICT_CONFIG=true`, or runtime config `auth.strict=true` fails startup if required secrets are missing.
- In non-strict (development) mode, missing secrets also fail startup unless `OR3_BASIC_AUTH_ALLOW_INSECURE_DEV=true` is set — then diagnostics are logged and provider registration is left disabled.

## Architecture notes

- Credentials/session state is stored in a provider-owned SQLite DB.
- Canonical OR3 users/workspaces are still resolved by the selected `AuthWorkspaceStore`.
- In `invite_only` mode, signed-token, expiry, persisted invite state/token hash, and normalized-email validation runs before Basic Auth creates an account or session.
- The selected `AuthWorkspaceStore` must support atomic invite provisioning; internal user/auth mapping, membership, and invite consumption are committed together by that provider.
- Invite links (`/?invite=TOKEN`, copied from Admin → Workspaces, or carried in the lock page's `next`) open registration for signed-out visitors with the token filled in. The token is removed from the address bar on first read and kept in memory for that page; only one mounted auth control (sidebar, mobile More sheet or lock page) opens registration per link. On mobile the account control lives in More, so registration opens when the visitor opens More. This invite-link handoff requires published `or3-provider-basic-auth@0.0.11` or later.
- Basic Auth account and initial refresh-session rows are created in one local SQLite transaction.
- Access JWTs are short-lived and validated by `basicAuthProvider.getSession(event)`.
- Refresh tokens are rotated and hashed at rest; replay attempts revoke active sessions.
- The refresh cookie is scoped to `/api` so `/api/auth/session` can transparently rotate expired access tokens during session resolution.
- Sign-out never refreshes the session: the user is resolved without rotation, and revoking a token also revokes the sessions it was rotated into and clears their rotation grace, so a replayed predecessor cannot recover a successor after logout.
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

New passwords must be at least eight characters and no more than 72 UTF-8 bytes, matching bcrypt's input limit. Existing account hashes remain verifiable, including passwords created before this limit was enforced.

Registration and password-change forms say **Use at least 8 characters**. If a password exceeds the limit, they ask the user to shorten it without exposing encoding terminology. This copy change does not change password validation.

The registration form labels the invitation field **Invite code** with the placeholder **Paste invite code**. Invite links still fill in the code automatically.

Registration distinguishes a different email on a signed, unexpired invitation from
an invalid or expired code. An email mismatch asks users to check for typos or use
the email that received the invitation, without disclosing that address. Invalid
codes ask users to check their invite link or request a new invitation; a missing
required code asks them to enter one. Form entries survive a rejected attempt,
which does not create credentials or accept the invitation. Email matching ignores
capitalization. The host exposes `invite_email_mismatch` for this preflight result;
rebuild both the updated host and provider to adopt it.

The registered sidebar auth adapter accepts `layout="rail"` (default) and
`layout="more-sheet"`. In the More sheet it renders Account/Login with the
host's shared full-width `.more-row` structure, while keeping the existing
popover and modal behavior.

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


### Testing local changes in OR3 Chat

With this repository beside `or3-chat`, run `bun install` here once, then
`bun run dev:ssr` from Chat. Chat's dev wrapper rebuilds the local provider and
prints its selected path; restart it after provider edits. Missing repositories
or failed builds fall back to installed packages with a warning.
`OR3_LOCAL_PROVIDERS=false` disables local selection. Production builds use the
installed package, so local development does not publish these changes.

Basic Auth's database always uses `better-sqlite3`, independently of the sync
provider's SQLite driver. If the source launcher selects Bun for sync, this
native binding must also work under the project-pinned Bun version. The launcher
checks it in that runtime before starting Nuxt and reports incompatible bindings
or runtime crashes. Managed Cloud uses Node with `better-sqlite3`.

## Instance signup invitations

The updated host distinguishes signup invites from existing team invites. Signup invites create a private workspace with only the recipient as owner; team invites retain their selected workspace and role. This requires the updated host and rebuilt provider artifacts, rather than the existing published release alone.

Registration preflight rejects invalid invites before credential creation, including in open mode. It resolves the explicit body token first, followed by the host's header, HttpOnly cookie, query, and Referer precedence. A valid token is retained in the invite cookie for canonical session resolution; an explicit replacement overrides a stale cookie. Without a token, open registration remains available. If credentials commit before canonical acceptance, use Already registered? Sign in with the same account and a valid or replacement invite. The sign-in request preserves manually pasted tokens, verifies the signed-in email, and uses the existing HttpOnly invite cookie. The selected sync store still owns atomic acceptance; provider-only credentials grant no protected OR3 access. No credential lifecycle or recovery service is added.

Provider-only tests use the exact host registration and token sources pinned in `tests/fixtures/host`, with SHA-256 provenance verified by Vitest. No sibling checkout is required. To exercise the current host integration, run `OR3_CANONICAL_HOST_ROOT=/absolute/path/to/or3-chat bun run test`. Refresh the pinned files and provenance together when adopting a reviewed host contract change; do not replace the host validation logic with a provider-local implementation.

### Short signup codes

New signup invitations use eight random characters (shown as `K7MP-4X9Q`) and retain clickable invite links. Lowercase, spaces, and an optional dash are accepted. The host hashes codes with HMAC using `OR3_AUTH_INVITE_TOKEN_SECRET`, shares a 20/minute/IP lookup limit across invitation entry points, and preserves email binding, expiry, revocation, and atomic single use. Previously issued signed links remain supported. Codes and hashes are omitted from invitation history.

The updated host and SQLite or Convex store must provide short-code resolution. Registration and replacement-code sign-in call the host preflight; backend acceptance remains the source of workspace access.
