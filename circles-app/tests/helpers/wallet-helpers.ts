import type { Page } from '@playwright/test';
import type { WalletType } from '$lib/utils/walletType';
import { testWallets, type WalletState } from '../fixtures/test-wallets';

const STORAGE_KEY = 'Circles.Storage';

export interface InjectWalletOptions {
  walletType?: WalletType;
  avatarAddress?: string;
}

export async function injectWalletState(
  page: Page,
  state: WalletState,
  options: InjectWalletOptions = {},
) {
  const wallet = testWallets[state];
  if (!wallet?.address || !wallet?.privateKey) {
    throw new Error(`Missing wallet credentials for ${state}. Check your .env.local file.`);
  }

  const payload = {
    version: 1,
    walletType: options.walletType ?? 'metamask',
    avatar: options.avatarAddress ?? wallet.address,
    privateKey: wallet.privateKey,
  };

  await page.addInitScript(({ key, data }) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: STORAGE_KEY, data: payload });
}
