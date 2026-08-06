import type { InjectionKey, Ref } from 'vue';

/**
 * Floating UI content options for auth UI popovers.
 * Hosts (e.g. mobile More menu) can inject overrides so nested menus
 * stay on-screen instead of defaulting to rail `side: 'right'`.
 */
export interface AuthUiPopoverContent {
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?:
    | number
    | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
}

/** String key so host app + provider package can share without a linked import. */
export const AUTH_UI_POPOVER_CONTENT_KEY = 'or3:auth-ui-popover-content';

export type AuthUiPopoverContentInjected =
  | AuthUiPopoverContent
  | Ref<AuthUiPopoverContent>;

export const AUTH_UI_POPOVER_CONTENT_INJECTION_KEY: InjectionKey<AuthUiPopoverContentInjected> =
  Symbol.for(AUTH_UI_POPOVER_CONTENT_KEY);
