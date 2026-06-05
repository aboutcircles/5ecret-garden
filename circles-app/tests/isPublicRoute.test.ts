import { describe, expect, it } from 'vitest';
import { isPublicRoute } from '$lib/shared/state/wallet.svelte';

describe('isPublicRoute', () => {
  describe('public routes (no wallet required)', () => {
    const publicPaths = [
      '/',
      '/util',
      '/connect-wallet',
      '/connect-wallet/connect-safe',
      '/connect-wallet/import-circles-garden',
      '/register',
      '/register/some/nested/step',
      '/privacy-policy',
      '/terms',
      '/kitchen-sink',
      '/kitchen-sink/identity',
    ];

    for (const path of publicPaths) {
      it(`treats ${JSON.stringify(path)} as public`, () => {
        expect(isPublicRoute(path)).toBe(true);
      });
    }
  });

  describe('auth-gated routes (wallet required)', () => {
    const authGatedPaths = [
      '/dashboard',
      '/groups',
      '/groups/members/0xabc',
      '/groups/metrics/0xdef',
      '/contacts',
      '/contacts/0xabc',
      '/market',
      '/admin',
      '/avatar-search',
      '/back-circles',
      '/jump',
      '/sales',
      '/settings',
    ];

    for (const path of authGatedPaths) {
      it(`treats ${JSON.stringify(path)} as auth-gated`, () => {
        expect(isPublicRoute(path)).toBe(false);
      });
    }
  });

  describe('edge cases', () => {
    it('rejects paths that contain but do not start with a public prefix', () => {
      // `/dashboard/register` is NOT the register flow; it's a dashboard child.
      // The startsWith check is intentional and only triggers on prefix match.
      expect(isPublicRoute('/dashboard/register')).toBe(false);
      expect(isPublicRoute('/groups/terms')).toBe(false);
    });

    it('treats empty string as auth-gated (defensive default)', () => {
      expect(isPublicRoute('')).toBe(false);
    });
  });
});
