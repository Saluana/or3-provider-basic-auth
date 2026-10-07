import { beforeEach, describe, expect, it } from 'vitest';
import {
  claimInviteLinkAutoOpen,
  readInviteLinkToken,
  resetInviteLinkForTests
} from '../invite-link.client';

// Admin → Workspaces copies `/?invite=TOKEN`; the lock page keeps it inside `next`.
describe('invite links', () => {
  beforeEach(() => resetInviteLinkForTests());

  it('reads the token once and removes it from the address bar, keeping the rest', () => {
    window.history.replaceState(null, '', '/chat?invite=tok%2Fen&tab=2#top');
    expect(readInviteLinkToken()).toBe('tok/en');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/chat?tab=2#top');
    expect(readInviteLinkToken()).toBe('tok/en');
  });

  it('reads a token carried through the lock page redirect', () => {
    window.history.replaceState(null, '', `/lock?next=${encodeURIComponent('/?invite=abc&x=1')}`);
    expect(readInviteLinkToken()).toBe('abc');
    expect(new URL(window.location.href).searchParams.get('next')).toBe('/?x=1');
  });

  it('lets only one mounted auth control open registration for a link', () => {
    window.history.replaceState(null, '', '/?invite=abc');
    expect(claimInviteLinkAutoOpen()).toBe(true);
    expect(claimInviteLinkAutoOpen()).toBe(false);
    expect(readInviteLinkToken()).toBe('abc');
  });

  it('has nothing to claim without an invite', () => {
    window.history.replaceState(null, '', '/?invite=%20');
    expect(readInviteLinkToken()).toBeNull();
    expect(claimInviteLinkAutoOpen()).toBe(false);
  });
});
