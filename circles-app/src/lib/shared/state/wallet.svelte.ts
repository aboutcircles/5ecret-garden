import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { avatarState } from '$lib/shared/state/avatar.svelte';
import { circles } from '$lib/shared/state/circles';
import { Sdk } from '@aboutcircles/sdk';
import {
  SafeContractRunner,
  SafeBrowserRunner,
} from '@aboutcircles/sdk-runner';
import { circlesConfig } from '@aboutcircles/sdk-core';
import { getCirclesConfig } from '$lib/shared/utils/helpers';
import { gnosisConfig } from '$lib/shared/config/circles';
import { JsonRpcProvider } from 'ethers';
import { type ContractRunner } from '@aboutcircles/sdk-types';
import type { Address } from '@aboutcircles/sdk-types';
import type { Eip1193Provider } from '@safe-global/protocol-kit';
import { CirclesStorage } from '$lib/shared/utils/storage';
import { groupMetrics } from '$lib/areas/groups/state/groupMetrics.svelte';
import { disconnect, getAccount, getConnectors, reconnect } from '@wagmi/core';
import { config } from '../../../config';
import { settings, getActiveConfig } from './settings.svelte';
import type { GroupType } from '@aboutcircles/sdk-types';
import { privateKeyToAccount } from 'viem/accounts';
import { gnosisChainConfig } from '$lib/shared/integrations/chain/chainConfig';
import { isHumanType, isGroupType, isOrganizationType } from '$lib/shared/utils/avatarHelpers';
import { withRetry, isTransientError } from '$lib/shared/utils/retry';
import { EoaBrowserRunner } from '$lib/shared/integrations/wallet/EoaBrowserRunner';
import { clearAll as clearCache } from '$lib/shared/cache';
import { teardownTransactionHistoryStore } from '$lib/shared/state/transactionHistory';
import { clearGatewaySpendingStore } from '$lib/shared/state/gatewaySpending.svelte';

export const wallet = writable<ContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;
export let signer: {
  address: Address | undefined;
  privateKey: string | undefined;
} = $state({
  address: undefined,
  privateKey: undefined,
});

/**
 * Connector state for tracking the active wallet connector.
 * Used to manage disconnect and reconnect flows.
 */
export let connectorState: {
  id: string | undefined;
  connected: boolean;
} = $state({
  id: undefined,
  connected: false,
});

export async function getSigner() {
  const connectorId = localStorage.getItem('connectorId');
  const connectors = getConnectors(config);

  // Try stored connector first if present; otherwise, try injected only
  // Note: We explicitly avoid the 'safe' connector here as it requires special handling
  // and causes JsonRpcProvider spam when MetaMask isn't connected
  const connector = connectors.find((c) => c.id == connectorId);

  try {
    if (connector) {
      await reconnect(config, { connectors: [connector] });
    } else {
      // Fall back to injected connector only (MetaMask, browser wallets)
      // Don't try safe() connector as it causes provider initialization issues
      const injectedConnector = connectors.find((c) => c.id === 'injected');
      if (injectedConnector) {
        await reconnect(config, { connectors: [injectedConnector] });
      } else {
        // Last resort: try generic reconnect
        await reconnect(config);
      }
    }
  } catch (err: any) {
    // reconnect() can throw even if wallet is already connected from previous session
    // Check if we already have an account before failing
    const existingAccount = getAccount(config);
    if (existingAccount.address) {
      console.log('[Wallet] reconnect() threw but account already connected:', existingAccount.address);
      // Fall through to use existing account
    } else {
      // No existing account - actually disconnected
      const error = new Error(err.message || 'Failed to reconnect wallet');
      (error as Error & { code?: number }).code = err.code;
      throw error;
    }
  }

  const account = getAccount(config);

  // Update connector state on successful connection
  if (account.address && account.connector) {
    connectorState.id = account.connector.id;
    connectorState.connected = true;
  }

  // Throw if no address - allows retry logic to work
  if (!account.address) {
    const error = new Error('Wallet not connected. Please unlock MetaMask and connect to this site.');
    (error as Error & { code?: number }).code = 4900; // EIP-1193: Disconnected
    throw error;
  }

  return account.address.toLowerCase() as Address;
}

export async function getSignerFromPk() {
  const privateKey = CirclesStorage.getInstance().privateKey;
  if (!privateKey) {
    return undefined;
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return {
    address: account.address?.toLowerCase() as Address,
    privateKey: privateKey,
  };
}

// New runner initialization functions using @aboutcircles/sdk-runner
export async function initNewSafeContractRunner(
  privateKey: string,
  safeAddress: Address
) {
  // Use chainRpcUrl for runner - it needs standard Ethereum RPC methods
  // (eth_call, eth_getTransactionReceipt, etc.) which circlesRpcUrl doesn't support
  const activeConfig = getActiveConfig();
  const rpcUrl = activeConfig.chainRpcUrl ?? activeConfig.circlesRpcUrl;

  // Use retry logic for resilience against transient connection failures
  const runner = await withRetry(
    () => SafeContractRunner.create(rpcUrl, privateKey as `0x${string}`, safeAddress, gnosisChainConfig),
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      isRetryable: isTransientError,
      onRetry: (attempt, error, delayMs) => {
        console.warn(
          `[Wallet] SafeContractRunner init failed (attempt ${attempt}/3), retrying in ${Math.round(delayMs / 1000)}s:`,
          error.message
        );
      },
    }
  );
  return runner;
}

export async function initNewSafeBrowserRunner(safeAddress: Address) {
  // Use chainRpcUrl for runner - it needs standard Ethereum RPC methods
  const activeConfig = getActiveConfig();
  const rpcUrl = activeConfig.chainRpcUrl ?? activeConfig.circlesRpcUrl;

  // Get the provider from wagmi's connected connector - avoids Phantom/MetaMask conflicts
  // when multiple wallet extensions are installed
  const account = getAccount(config);
  if (!account.connector) {
    throw new Error('No wallet connector found. Please connect your wallet first.');
  }

  const provider = await account.connector.getProvider();
  if (!provider) {
    throw new Error('Failed to get provider from wallet connector');
  }

  // Use retry logic for resilience against transient connection failures
  const runner = await withRetry(
    () => SafeBrowserRunner.create(rpcUrl, provider as Eip1193Provider, safeAddress, gnosisChainConfig),
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      isRetryable: isTransientError,
      onRetry: (attempt, error, delayMs) => {
        console.warn(
          `[Wallet] SafeBrowserRunner init failed (attempt ${attempt}/3), retrying in ${Math.round(delayMs / 1000)}s:`,
          error.message
        );
      },
    }
  );
  return runner;
}

export async function initNewEoaBrowserRunner(eoaAddress: Address) {
  const activeConfig = getActiveConfig();
  const rpcUrl = activeConfig.chainRpcUrl ?? activeConfig.circlesRpcUrl;

  const account = getAccount(config);
  if (!account.connector) {
    throw new Error('No wallet connector found. Please connect your wallet first.');
  }

  const provider = await account.connector.getProvider();
  if (!provider) {
    throw new Error('Failed to get provider from wallet connector');
  }

  const runner = await withRetry(
    () => EoaBrowserRunner.create(rpcUrl, provider, eoaAddress),
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      isRetryable: isTransientError,
      onRetry: (attempt, error, delayMs) => {
        console.warn(
          `[Wallet] EoaBrowserRunner init failed (attempt ${attempt}/3), retrying in ${Math.round(delayMs / 1000)}s:`,
          error.message
        );
      },
    }
  );
  return runner;
}

// Mirrors shouldBypassWalletRestore in +layout.svelte; the two lists must
// stay in sync. Uses raw pathname instead of SvelteKit's parameterized
// route id so it can run anywhere (incl. outside a SvelteKit context).
export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/util' ||
    pathname.startsWith('/connect-wallet') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/privacy-policy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/kitchen-sink')
  );
}

export async function restoreSession() {
  const privateKey = CirclesStorage.getInstance().privateKey;
  const savedAvatar = CirclesStorage.getInstance().avatar;

  // Fresh visit / signed-out state — nothing to restore. Skip silently instead
  // of throwing, otherwise every first-time landing fires a red "Session Restore
  // Failed" error toast. If the user is on an auth-gated route (deep-linked
  // /dashboard, or wagmi lost the connector between sessions), redirect to /
  // so the landing-page Connect Wallet button is the obvious next step.
  // Without this redirect the dashboard renders "0 Circles" with no recovery
  // UI — the mid-session disconnect path is covered by clearSession()'s own
  // goto('/'), this branch covers the no-storage-on-load path.
  if (!privateKey && !savedAvatar) {
    if (typeof window !== 'undefined' && !isPublicRoute(window.location.pathname)) {
      await goto('/');
    }
    return;
  }

  try {
    const rings: boolean = CirclesStorage.getInstance().rings ? true : false;

    // Sync settings with stored rings preference
    if (settings.ring !== rings) {
      settings.ring = rings;
    }

    let newRunner;
    let sdk: Sdk;

    if (privateKey && savedAvatar) {
      // Safe + PK path - use NEW SDK with runner
      newRunner = await initNewSafeContractRunner(
        privateKey,
        savedAvatar as Address
      );

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      signer.address = account.address?.toLowerCase() as Address;
      signer.privateKey = privateKey;

      // Use the new SDK with runner - get config from settings
      const activeConfig = getActiveConfig();
      sdk = new Sdk(activeConfig, newRunner);
    } else {
      // savedAvatar present without a private key → Safe + browser provider
      // path (EOA != Safe). Reconnect wagmi first so the connector is available
      // for the browser runner. The "neither" case was already short-circuited
      // at the top of the function.
      signer.privateKey = undefined;
      try {
        signer.address = await getSigner();
      } catch (reconnectErr: any) {
        // getSigner failed — try a plain reconnect as fallback before giving up
        console.warn('[Wallet] getSigner failed during restore, trying plain reconnect:', reconnectErr.message);
        await reconnect(config);
        const account = getAccount(config);
        if (!account.address) {
          throw new Error('Wallet not connected. Please reconnect your wallet.');
        }
        signer.address = account.address.toLowerCase() as Address;
      }

      newRunner = await initNewSafeBrowserRunner(savedAvatar as Address);

      // Use the new SDK with runner - get config from settings
      const activeConfig = getActiveConfig();
      sdk = new Sdk(activeConfig, newRunner);
    }

    if (!sdk) {
      throw new Error('Failed to initialize SDK');
    }

    circles.set(sdk);
    // Publish the runner so tx-submission utilities (sendRunnerTransactionAndWait,
    // gateway flows, unwrap, etc.) work after a page reload. The connect-wallet
    // pages set this on first connect; restoreSession was missing the same call.
    wallet.set(newRunner as ContractRunner);

    let savedGroup = CirclesStorage.getInstance().group;

    const avatarToRestore = (savedGroup ??
      savedAvatar ??
      (newRunner?.address || sdk.contractRunner?.address)) as Address;

    // Restore the avatar with event subscription. If subscribe fails (the
    // WS-bug captured in memory/sdk_websocket_bug.md occasionally never
    // resolves), the user must NOT be bounced to /register — that's a UX
    // regression where a transient WS hiccup looks like a logged-out state
    // and forces re-login. Fall back to a non-subscribed avatar; the user
    // keeps a working session in read/sign mode, just without live event
    // pushes (a refresh later reconnects).
    let avatar;
    try {
      avatar = await withRetry(
        () => sdk.getAvatar(avatarToRestore, true),
        {
          maxAttempts: 5,
          initialDelayMs: 1000,
          maxDelayMs: 15000,
          isRetryable: isTransientError,
          updateConnectionStatus: true,
          statusLabel: 'Wallet',
          onRetry: (attempt, error, delayMs) => {
            console.warn(
              `[Wallet] Avatar subscription failed (attempt ${attempt}/5), retrying in ${Math.round(delayMs / 1000)}s:`,
              error.message
            );
          },
        }
      );
    } catch (subscribeError) {
      console.warn(
        '[Wallet] Avatar subscription retries exhausted, falling back to non-subscribed restore:',
        subscribeError
      );
      // Non-subscribed restore — pure data read, no WS. If THIS fails, the
      // outer catch handles it as the original code did.
      avatar = await sdk.getAvatar(avatarToRestore, false);
    }

    if (avatar) {
      avatarState.avatar = avatar;

      // Detect avatar type from the avatarInfo returned by SDK (now properly typed)
      const avatarType = avatar.avatarInfo?.type;

      if (isGroupType(avatarType)) {
        avatarState.isGroup = true;
        avatarState.isHuman = false;
        // Try to get group type from storage or avatarInfo
        avatarState.groupType =
          (CirclesStorage.getInstance().groupType as GroupType) ||
          'Standard';
      } else if (isOrganizationType(avatarType)) {
        avatarState.isGroup = false;
        avatarState.isHuman = false;
        avatarState.groupType = undefined;
      } else {
        // Default to human
        avatarState.isGroup = false;
        avatarState.isHuman = true;
        avatarState.groupType = undefined;
      }
    } else {
      await goto('/register');
    }
  } catch (error) {
    console.error('[Wallet] Session restore failed:', error);

    // Only nuke the saved session on definitively terminal errors. For
    // transient network / RPC / WS failures, leave localStorage intact so
    // the next page-load can retry — clearSession() wipes the in-app PK
    // (Circles-native variant), and we don't want a 5-second RPC blip to
    // brick a funded avatar. clearSession() itself navigates to '/'.
    const transient = error instanceof Error && isTransientError(error);
    if (!transient) {
      clearSession();
    }
  }
}

export async function clearSession() {
  // Use connectorState or fallback to localStorage for backward compatibility
  const connectorId = connectorState.id || localStorage.getItem('connectorId');
  const connector = getConnectors(config).find((c) => c.id == connectorId);
  if (connector) {
    // A wallet/connector that rejects on disconnect must not abort the rest of teardown —
    // otherwise the avatar's event subscription + timers (released below) would leak and a
    // re-login could hit the dedup guard. Swallow the disconnect error and continue.
    try {
      await disconnect(config, { connector: connector });
    } catch (e) {
      console.warn('[Wallet] disconnect failed during clearSession; continuing teardown', e);
    }
    localStorage.removeItem('connectorId');
  }
  // Reset connector state
  Object.assign(connectorState, {
    id: undefined,
    connected: false,
  });
  Object.assign(groupMetrics, {
    memberCountPerHour: undefined,
    memberCountPerDay: undefined,
    mintRedeemPerHour: undefined,
    mintRedeemPerDay: undefined,
    wrapUnwrapPerHour: undefined,
    wrapUnwrapPerDay: undefined,
    collateralInTreasury: undefined,
    tokenHolderBalance: undefined,
    erc20Token: undefined,
    priceHistoryWeek: undefined,
    priceHistoryMonth: undefined,
  });
  Object.assign(avatarState, {
    avatar: undefined,
    isGroup: undefined,
    isHuman: undefined,
    groupType: undefined,
    profile: undefined,
  });
  Object.assign(signer, {
    address: undefined,
    privateKey: undefined,
  });
  circles.set(undefined);
  // The transaction-history store holds its event subscription + timers at module scope,
  // so release them explicitly (the balance/contacts stores self-clean on unmount).
  teardownTransactionHistoryStore();
  clearGatewaySpendingStore();
  CirclesStorage.getInstance().clear();
  void clearCache();
  await goto('/');
}
