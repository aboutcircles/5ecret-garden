import type { WalletProvider } from '@circles-market/sdk';
import { CirclesStorage } from '$lib/shared/utils/storage';
import { getConnectorId } from '$lib/shared/state/connector';
import { createLocalWalletProvider } from './localWalletProvider';

type InjectedProviderLike = WalletProvider & {
  isMetaMask?: boolean;
  isRabby?: boolean;
};

function normalizeConnectorId(id: string | null | undefined): string {
  return String(id ?? '').trim().toLowerCase();
}

function chooseInjectedProvider(
  injected: (InjectedProviderLike & { providers?: InjectedProviderLike[] }) | undefined,
  connectorId: string | null,
): WalletProvider | undefined {
  if (!injected) return undefined;

  const providers = Array.isArray(injected.providers) ? injected.providers : [];
  if (providers.length === 0) {
    return injected?.request ? injected : undefined;
  }

  const normalized = normalizeConnectorId(connectorId);
  const wantsRabby = normalized.includes('rabby');
  const wantsMetaMask =
    normalized.includes('meta') || normalized.includes('metamask') || normalized.includes('injected');

  if (wantsRabby) {
    const rabby = providers.find((p) => p?.isRabby === true && typeof p?.request === 'function');
    if (rabby) return rabby;
  }

  if (wantsMetaMask) {
    const metamask = providers.find(
      (p) => p?.isMetaMask === true && p?.isRabby !== true && typeof p?.request === 'function',
    );
    if (metamask) return metamask;
  }

  // Fallback: first valid EIP-1193 provider.
  return providers.find((p) => typeof p?.request === 'function') ?? (injected?.request ? injected : undefined);
}

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

  const injected = (typeof window !== 'undefined' ? (window as any).ethereum : undefined) as
    | (InjectedProviderLike & { providers?: InjectedProviderLike[] })
    | undefined;

  const selected = chooseInjectedProvider(injected, getConnectorId());
  if (!selected?.request) {
    throw new Error('No wallet provider available');
  }
  return selected;
}
