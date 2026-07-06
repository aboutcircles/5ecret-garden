import { describe, expect, it } from 'vitest';
import { isWooCommerceEnabled } from '$lib/areas/admin/capabilities';

/**
 * WooCommerce's market-api admin surface (/admin/wc-*) ships on the staging branch/
 * deployment only; production builds `master`, which 404s those routes. The admin UI
 * gates its WooCommerce calls + tab on this predicate so prod shows a "staging only"
 * notice instead of firing the call and collapsing the page on the 404.
 */
describe('isWooCommerceEnabled', () => {
  it('is enabled on staging', () => {
    expect(isWooCommerceEnabled('staging')).toBe(true);
  });

  it('is disabled on production', () => {
    expect(isWooCommerceEnabled('production')).toBe(false);
  });

  it('defaults to disabled when the server is unset (production is the default)', () => {
    expect(isWooCommerceEnabled(undefined)).toBe(false);
  });
});
