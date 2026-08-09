/**
 * Host apps can inject a layout mode so auth triggers match the surface
 * (sidebar rail tiles vs mobile More sheet list rows).
 */
export type AuthUiLayout = 'rail' | 'more-sheet';

/** String key so host app + provider package can share without a linked import. */
export const AUTH_UI_LAYOUT_KEY = 'or3:auth-ui-layout';
