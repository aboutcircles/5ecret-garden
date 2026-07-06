/**
 * Structural mirror of `settings.svelte.ts` `ServerEnv`, kept local so this module
 * stays a plain, dependency-free capability helper (no import from the reactive
 * settings runes module). The two are the same literal union, so callers can pass
 * `settings.server` directly.
 */
type ServerEnv = 'production' | 'staging';

/**
 * Servers whose market-api exposes the WooCommerce admin surface (`/admin/wc-*`).
 *
 * Those endpoints (`Circles.Market.Api/Admin/AdminEndpoints.cs`) currently ship on
 * the staging branch/deployment only — production builds `master`, which does not
 * register them, so calling them against prod returns 404. The admin UI gates its
 * WooCommerce interactions on this list to avoid firing those calls (and to tell the
 * user why WooCommerce is unavailable) rather than collapsing on the 404.
 *
 * When the WooCommerce admin surface lands on `master` and is deployed to prod, add
 * `'production'` here — or replace this static list with backend capability detection.
 */
const WOOCOMMERCE_SERVERS: readonly ServerEnv[] = ['staging'];

/**
 * Whether the WooCommerce admin surface is available on the given server.
 * Defaults to production (the disabled case) when the server is unset.
 */
export function isWooCommerceEnabled(server: ServerEnv | undefined): boolean {
  return WOOCOMMERCE_SERVERS.includes(server ?? 'production');
}
