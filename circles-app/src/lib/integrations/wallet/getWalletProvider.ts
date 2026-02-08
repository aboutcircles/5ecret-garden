import type { WalletProvider } from '@circles-market/sdk';
import { CirclesStorage } from '$lib/utils/storage';
import { createLocalWalletProvider } from './localWalletProvider';

/**
 * Returns a WalletProvider for the current session.
 * - If a private key is stored, uses the local signer provider.
 * - Otherwise, uses the injected `window.ethereum` provider.
 */
export function getWalletProvider(): WalletProvider {
  const pk = CirclesStorage.getInstance().privateKey;
  if (pk) {
    return createLocalWalletProvider();
  }
  const injected = (typeof window !== 'undefined' ? (window as any).ethereum : undefined) as WalletProvider | undefined;
  if (!injected?.request) {
    throw new Error('No wallet provider available');
  }
  return injected;
}
