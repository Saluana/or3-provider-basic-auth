/**
 * Invite links (`/?invite=TOKEN`, copied from Admin → Workspaces) carry the
 * registration token. The lock page keeps the original URL in `next`.
 *
 * The token is read once per page load and removed from the address bar so it
 * is not left in history or shared again by accident; it stays in memory to
 * fill in registration. Several auth controls can be mounted at once (sidebar
 * rail, mobile More sheet, lock page), so only the first claim opens
 * registration automatically.
 */
let token: string | null | undefined;
let autoOpenClaimed = false;

function takeInvite(url: URL): string | null {
  const direct = url.searchParams.get('invite')?.trim();
  if (direct) {
    url.searchParams.delete('invite');
    return direct;
  }
  const next = url.searchParams.get('next');
  if (!next) return null;
  const target = new URL(next, url.origin);
  const carried = target.searchParams.get('invite')?.trim();
  if (!carried) return null;
  target.searchParams.delete('invite');
  url.searchParams.set('next', target.pathname + target.search + target.hash);
  return carried;
}

export function readInviteLinkToken(): string | null {
  if (token !== undefined) return token;
  token = null;
  if (typeof window === 'undefined') return token;
  try {
    const url = new URL(window.location.href);
    token = takeInvite(url);
    if (token) window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    token = null;
  }
  return token;
}

/** True for the one caller that should open registration for this link. */
export function claimInviteLinkAutoOpen(): boolean {
  if (!readInviteLinkToken() || autoOpenClaimed) return false;
  autoOpenClaimed = true;
  return true;
}

export function resetInviteLinkForTests(): void {
  token = undefined;
  autoOpenClaimed = false;
}
