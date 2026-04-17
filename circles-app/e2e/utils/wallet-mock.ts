import type { Page } from '@playwright/test';
import { TEST_AVATAR_ADDRESS } from '../fixtures/test-data';

/**
 * Wallet session shape matching CirclesStorage (src/lib/shared/utils/storage.ts).
 * The `circles` wallet type uses a private key stored in localStorage.
 * For E2E tests with mocked RPC, the key is never used for real signing.
 */
interface WalletSession {
  version: 1;
  walletType: 'circles' | 'safe' | 'injected';
  avatar: string;
  rings?: boolean;
  group?: string;
  isGroup?: boolean;
  groupType?: string;
  privateKey?: string;
}

const STORAGE_KEY = 'Circles.Storage';

/**
 * Inject a wallet session into localStorage before the page loads.
 * Must be called BEFORE page.goto() to ensure the app sees it on init.
 *
 * The test private key comes from the E2E_TEST_PRIVATE_KEY env var.
 * This key is only used for SDK initialization — all RPC calls are mocked,
 * so no real transactions are signed.
 */
export async function injectWalletSession(
  page: Page,
  options: Partial<WalletSession> = {},
) {
  const testKey = process.env.E2E_TEST_PRIVATE_KEY;
  if (!testKey) {
    throw new Error(
      'E2E_TEST_PRIVATE_KEY env var must be set for wallet tests. ' +
      'Use a dedicated test-only key with no real funds.',
    );
  }

  const session: WalletSession = {
    version: 1,
    walletType: 'circles',
    avatar: TEST_AVATAR_ADDRESS,
    privateKey: testKey,
    ...options,
  };

  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(session) },
  );
}

/**
 * Clear the wallet session from localStorage.
 * Useful for testing the logged-out state.
 */
export async function clearWalletSession(page: Page) {
  await page.evaluate((key: string) => {
    localStorage.removeItem(key);
  }, STORAGE_KEY);
}
