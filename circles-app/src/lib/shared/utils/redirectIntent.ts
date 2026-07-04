// Redirect-after-auth intent. When an unauthenticated visitor deep-links to a
// gated route (e.g. /market), the wallet guard bounces them to the landing page
// to connect. Without remembering where they were headed, sign-in always dumps
// them on /dashboard and the original destination is lost. We stash the intended
// path here before the bounce and consume it once, after connect completes.
//
// Backed by sessionStorage (per-tab, cleared when the tab closes) so a stale
// destination can never resurface in a later session — unlike the persistent
// CirclesStorage used for wallet data.

const KEY = 'Circles.RedirectAfterAuth';

// Same-origin app paths only: a value must start with a single '/'. This rejects
// protocol-relative ('//evil.com') and backslash-smuggled ('/\\evil.com') URLs,
// so the stored value can never drive an open redirect off the app.
function isSafeInternalPath(path: string | null | undefined): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/\\')
  );
}

/**
 * Remember where the user was headed before we redirect them to sign in.
 * No-ops for unsafe paths and for routes it would be pointless to return to
 * (the landing page and the connect-wallet flow itself).
 */
export function rememberRedirect(path: string): void {
  if (typeof sessionStorage === 'undefined') return;
  if (!isSafeInternalPath(path)) return;
  if (path === '/' || path.startsWith('/connect-wallet')) return;
  sessionStorage.setItem(KEY, path);
}

/**
 * Consume the remembered destination (one-shot — cleared on read), or return the
 * fallback when nothing safe is stored.
 */
export function takeRedirect(fallback = '/dashboard'): string {
  if (typeof sessionStorage === 'undefined') return fallback;
  const stored = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return isSafeInternalPath(stored) ? stored : fallback;
}
