<script lang="ts">
  import type { Address, TokenHolderRow } from '@aboutcircles/sdk-types';
  import type { GroupTokenHolderRow } from '@aboutcircles/sdk-rpc';
  import { circles } from '$lib/shared/state/circles';
  import { formatEther } from 'ethers';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { getProfilesCoreBatch } from '$lib/shared/utils/profile';
  import type { ProfileAddress } from '$lib/shared/model/profile';

  interface Props {
    tokenAddress: Address;
    isPersonalToken?: boolean; // If true, use sdk.tokens.getHolders, otherwise use avatar.group.getHolders
  }

  let { tokenAddress, isPersonalToken = false }: Props = $props();

  // Union type for holders - can be either personal token holders or group token holders
  type HolderRow = TokenHolderRow | GroupTokenHolderRow;
  type HolderQuery = {
    queryNextPage(): Promise<boolean>;
    currentPage?: { results: HolderRow[]; hasMore: boolean };
  };

  // Lazy pagination: fetch one page at a time and batch-prefetch its profiles
  // before the Avatars mount. Avoids the prior eager `while (queryNextPage())`
  // drain that loaded every holder on first render and queued an avatar fetch
  // per row.
  let displayedHolders: HolderRow[] = $state([]);
  let isLoading: boolean = $state(false);
  let hasMore: boolean = $state(true);
  let initialized: boolean = $state(false);
  let currentTokenAddress: Address | undefined = $state(undefined);
  const PAGE_SIZE = 50;
  let error: string | null = $state(null);
  let hasError: boolean = $state(false);
  let activeQuery: HolderQuery | null = null;
  let loadGeneration = 0;

  function getHolderAddress(holder: HolderRow): Address {
    return isPersonalTokenHolder(holder) ? holder.account : holder.holder;
  }

  function primeProfiles(rows: HolderRow[]): void {
    if (rows.length === 0) return;
    const addrs = rows.map((r) => getHolderAddress(r) as unknown as ProfileAddress);
    void getProfilesCoreBatch(addrs).catch(() => {});
  }

  async function loadNextPage(generation: number): Promise<void> {
    if (!activeQuery) return;
    const hasPage = await activeQuery.queryNextPage();
    if (generation !== loadGeneration) return;
    if (!hasPage || !activeQuery.currentPage) {
      hasMore = false;
      return;
    }
    const page = activeQuery.currentPage;
    primeProfiles(page.results);
    displayedHolders = [...displayedHolders, ...page.results];
    hasMore = page.hasMore;
  }

  async function loadInitialData() {
    if (!$circles) return;
    if (isLoading) return;

    const generation = ++loadGeneration;
    isLoading = true;
    error = null;
    hasError = false;
    displayedHolders = [];
    hasMore = true;
    activeQuery = null;

    try {
      activeQuery = isPersonalToken
        ? ($circles.tokens.getHolders(tokenAddress, PAGE_SIZE) as unknown as HolderQuery)
        : ($circles.groups.getHolders(tokenAddress, PAGE_SIZE) as unknown as HolderQuery);

      await loadNextPage(generation);
    } catch (err) {
      if (generation !== loadGeneration) return;
      console.error('Error loading token holders:', err);
      hasError = true;
      error = err instanceof Error ? err.message : 'Failed to load token holders';
      displayedHolders = [];
      hasMore = false;
    } finally {
      if (generation === loadGeneration) {
        currentTokenAddress = tokenAddress;
        initialized = true;
        isLoading = false;
      }
    }
  }

  async function loadMore() {
    if (isLoading || !hasMore || !activeQuery) return;
    const generation = loadGeneration;
    isLoading = true;
    try {
      await loadNextPage(generation);
    } catch (err) {
      if (generation !== loadGeneration) return;
      console.warn('Error loading next holders page:', err);
    } finally {
      if (generation === loadGeneration) isLoading = false;
    }
  }

  const SCROLL_THROTTLE_MS = 500;
  let lastScrollTime = 0;

  function handleScroll(event: Event) {
    const now = Date.now();
    if (now - lastScrollTime < SCROLL_THROTTLE_MS) return;
    lastScrollTime = now;

    const target = event.target as HTMLDivElement;
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom < 100 && !isLoading && hasMore) {
      void loadMore();
    }
  }

  // Helper to check if holder is a personal token holder
  function isPersonalTokenHolder(holder: HolderRow): holder is TokenHolderRow {
    return 'account' in holder;
  }

  // Get demurraged balance from either type
  function getDemurragedBalance(holder: HolderRow): string | bigint {
    return isPersonalTokenHolder(holder) ? holder.balance : holder.demurragedTotalBalance;
  }

  // Get total balance (only for group tokens)
  function getTotalBalance(holder: HolderRow): bigint | null {
    return isPersonalTokenHolder(holder) ? null : holder.totalBalance;
  }

  // Get ownership fraction (only for group tokens)
  function getOwnershipFraction(holder: HolderRow): number | null {
    return isPersonalTokenHolder(holder) ? null : holder.fractionOwnership;
  }

  function formatBalance(balance: string | bigint | null | undefined): string {
    if (balance === null || balance === undefined) {
      return '0.00';
    }
    try {
      const balanceInCrc = Number(formatEther(balance)) || 0;
      const abs = Math.abs(balanceInCrc);
      return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
    } catch (error) {
      console.warn('Error formatting balance:', balance, error);
      return '0.00';
    }
  }

  function formatPercentage(fraction: number | null | undefined): string {
    if (fraction === null || fraction === undefined) {
      return 'N/A';
    }
    const percentage = fraction * 100;
    return percentage < 0.01 ? '< 0.01' : percentage.toFixed(2);
  }

  $effect(() => {
    if (!$circles || !tokenAddress) return;

    if (!initialized) {
      void loadInitialData();
      return;
    }

    if (currentTokenAddress !== tokenAddress) {
      initialized = false;
      void loadInitialData();
    }
  });
</script>

<div class="bg-white rounded-xl border shadow-sm overflow-hidden">
  <div class="p-6 border-b">
    <h2 class="text-lg font-semibold text-gray-800">Token Holders</h2>
    <div class="flex items-center justify-between mt-1">
      {#if hasMore}
        <p class="text-sm text-gray-500">Scroll for more</p>
      {:else}
        <p class="text-sm text-gray-500">All holders loaded</p>
      {/if}
      {#if hasMore && !isLoading}
        <button onclick={() => loadMore()} class="btn btn-sm btn-ghost">
          Load More (Debug)
        </button>
      {/if}
    </div>
  </div>

  <div class="max-h-[600px] overflow-y-auto" onscroll={handleScroll}>
    {#if hasError}
      <div class="p-8 text-center">
        <div class="text-red-600 font-semibold mb-2">
          Failed to load token holders
        </div>
        {#if error}
          <div class="text-sm text-gray-600 mb-4">{error}</div>
        {/if}
        <button
          onclick={() => {
            initialized = false;
            loadInitialData();
          }}
          class="btn btn-sm btn-primary"
        >
          Retry
        </button>
      </div>
    {:else if displayedHolders.length === 0 && !isLoading}
      <div class="p-8 text-center text-gray-500">No token holders found</div>
    {:else}
      <div>
        {#each displayedHolders as holder, index}
          <RowFrame clickable={false} dense={true} noLeading={true}>
            <div class="w-full flex items-center justify-between">
              <div class="min-w-0 flex items-center gap-3">
                <span class="text-sm font-medium text-gray-500">
                  #{index + 1}
                </span>
                <Avatar
                  address={getHolderAddress(holder)}
                  view="horizontal"
                  clickable={true}
                  topInfo={''}
                  bottomInfo={!isPersonalToken
                    ? `${formatPercentage(getOwnershipFraction(holder))}% ownership`
                    : ''}
                />
              </div>

              <div class="text-right shrink-0">
                {#if !isPersonalToken && getTotalBalance(holder)}
                  <div>
                    <span class="text-black font-bold"
                      >{formatBalance(getTotalBalance(holder))}</span
                    >
                    <span class="text-gray-500"> CRC</span>
                  </div>
                  <div class="text-xs text-gray-500">
                    {formatBalance(getDemurragedBalance(holder))} demurraged
                  </div>
                {:else}
                  <div>
                    <span class="text-black font-bold"
                      >{formatBalance(getDemurragedBalance(holder))}</span
                    >
                    <span class="text-gray-500"> CRC</span>
                  </div>
                {/if}
              </div>
            </div>
          </RowFrame>
        {/each}
      </div>
    {/if}

    {#if isLoading}
      <div class="p-8 flex justify-center items-center">
        <div class="flex items-center gap-2 text-gray-500">
          <svg
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span class="text-sm">Loading more holders...</span>
        </div>
      </div>
    {/if}

    {#if !hasMore && displayedHolders.length > 0}
      <div class="p-4 text-center text-sm text-gray-500">
        All {displayedHolders.length} holders loaded
      </div>
    {/if}
  </div>
</div>
