import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { Avatar } from '@aboutcircles/sdk';
import type { TokenBalance } from '@aboutcircles/sdk-types';

vi.mock('$lib/shared/cache', () => ({
  writeBalances: vi.fn().mockResolvedValue(undefined),
  makeScopeId: (address: string) => `gnosis:${address.toLowerCase()}`,
}));

function createMockBalance(
  overrides: Partial<TokenBalance> = {}
): TokenBalance {
  return {
    tokenId: 'token-1',
    tokenAddress: '0x1111111111111111111111111111111111111111',
    tokenOwner: '0x2222222222222222222222222222222222222222',
    tokenType: 'CrcV2_RegisterHuman',
    circles: 1,
    staticCircles: 1,
    attoCircles: 1000000000000000000n,
    isWrapped: false,
    isInflationary: false,
    ...overrides,
  } as TokenBalance;
}

function createMockAvatar(options: {
  address?: string;
  getTokenBalances: () => Promise<TokenBalance[]>;
  subscribe?: () => () => void;
}): Avatar {
  return {
    address: options.address ?? '0x1234567890123456789012345678901234567890',
    balances: {
      getTokenBalances: options.getTokenBalances,
    },
    events: {
      subscribe: options.subscribe ?? (() => () => {}),
    },
  } as unknown as Avatar;
}

async function waitFor(assertion: () => void, timeoutMs = 1000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  assertion();
}

describe('circlesBalances', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('refreshBalanceStore reloads and re-sorts balances for the current avatar after a confirmed tx', async () => {
    const initialBalances = [createMockBalance()];
    const higherBalance = createMockBalance({
      tokenId: 'token-2',
      tokenAddress: '0x3333333333333333333333333333333333333333',
      tokenOwner: '0x4444444444444444444444444444444444444444',
      circles: 3,
      staticCircles: 3,
      attoCircles: 3000000000000000000n,
    });
    const lowerBalance = createMockBalance();
    const refreshedBalances = [lowerBalance, higherBalance];

    const getTokenBalances = vi
      .fn<() => Promise<TokenBalance[]>>()
      .mockResolvedValueOnce(initialBalances)
      .mockResolvedValueOnce(refreshedBalances);

    const avatar = createMockAvatar({
      getTokenBalances,
      subscribe: vi.fn(() => vi.fn()),
    });

    const { circlesBalances, initBalanceStore, refreshBalanceStore } =
      await import('$lib/shared/state/circlesBalances');

    initBalanceStore(avatar);

    await waitFor(() => {
      expect(get(circlesBalances).data).toEqual(initialBalances);
    });

    expect(getTokenBalances).toHaveBeenCalledTimes(1);

    // Re-initializing the same avatar is deduped, so a manual refresh is required.
    initBalanceStore(avatar);
    expect(getTokenBalances).toHaveBeenCalledTimes(1);

    await refreshBalanceStore(avatar);

    expect(get(circlesBalances).data).toEqual([higherBalance, lowerBalance]);
    expect(getTokenBalances).toHaveBeenCalledTimes(2);
  });

  it('does not overwrite the active store when an older avatar tx finishes after an account switch', async () => {
    const firstAvatarBalances = vi
      .fn<() => Promise<TokenBalance[]>>()
      .mockResolvedValueOnce([createMockBalance({ circles: 1 })])
      .mockResolvedValueOnce([createMockBalance({ circles: 5 })]);
    const secondAvatarSnapshot = [
      createMockBalance({
        tokenId: 'token-9',
        tokenAddress: '0x9999999999999999999999999999999999999999',
        circles: 9,
        staticCircles: 9,
        attoCircles: 9000000000000000000n,
      }),
    ];
    const secondAvatarBalances = vi
      .fn<() => Promise<TokenBalance[]>>()
      .mockResolvedValueOnce(secondAvatarSnapshot);

    const firstAvatar = createMockAvatar({
      address: '0x1111111111111111111111111111111111111111',
      getTokenBalances: firstAvatarBalances,
      subscribe: vi.fn(() => vi.fn()),
    });
    const secondAvatar = createMockAvatar({
      address: '0x2222222222222222222222222222222222222222',
      getTokenBalances: secondAvatarBalances,
      subscribe: vi.fn(() => vi.fn()),
    });

    const { circlesBalances, initBalanceStore, refreshBalanceStore } =
      await import('$lib/shared/state/circlesBalances');

    initBalanceStore(firstAvatar);
    await waitFor(() => {
      expect(get(circlesBalances).data).toEqual([
        createMockBalance({ circles: 1 }),
      ]);
    });

    initBalanceStore(secondAvatar);
    await waitFor(() => {
      expect(get(circlesBalances).data).toEqual(secondAvatarSnapshot);
    });

    await refreshBalanceStore(firstAvatar);

    expect(get(circlesBalances).data).toEqual(secondAvatarSnapshot);
    expect(firstAvatarBalances).toHaveBeenCalledTimes(2);
  });
});
