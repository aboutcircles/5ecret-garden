<script lang="ts">
    import type { Address } from '@circles-sdk-v2/types';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import { circles } from '$lib/stores/circles';
    import { formatEther } from 'ethers';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import RowFrame from '$lib/ui/RowFrame.svelte';

    // Type definitions for token holders
    type TokenHolder = {
        account: Address;
        tokenAddress: Address;
        demurragedTotalBalance: string;
    };

    type GroupTokenHolderRow = {
        group: Address;
        holder: Address;
        totalBalance: bigint;
        demurragedTotalBalance: bigint;
        fractionOwnership: number;
    };

    interface Props {
        tokenAddress: Address;
        isPersonalToken?: boolean; // If true, use sdk.tokens.getHolders, otherwise use avatar.group.getHolders
    }

    let { tokenAddress, isPersonalToken = false }: Props = $props();

    // Union type for holders - can be either personal token holders or group token holders
    type HolderRow = TokenHolder | GroupTokenHolderRow;

    let allHolders: HolderRow[] = $state([]); // All holders from backend
    let displayedHolders: HolderRow[] = $state([]); // Holders currently displayed
    let isLoading: boolean = $state(false);
    let hasMore: boolean = $state(true);
    let lastScrollTime: number = 0;
    let scrollThrottle: number = 500; // ms between scroll checks
    let initialized: boolean = $state(false);
    let currentTokenAddress: Address | undefined = $state(undefined);
    let pageSize: number = 50;
    let currentPage: number = 0;

    async function loadInitialData() {
        // For personal tokens, we need the SDK from circles store
        if (isPersonalToken && !$circles) {
            console.log('⏸️ loadInitialData skipped: no SDK for personal token');
            return;
        }

        // For group tokens, we need the avatar
        if (!isPersonalToken && !avatarState.avatar) {
            console.log('⏸️ loadInitialData skipped: no avatar');
            return;
        }

        // Prevent concurrent initialization
        if (isLoading) {
            console.log('⏸️ loadInitialData skipped: already loading');
            return;
        }

        console.log('🔄 Loading ALL token holders data...', { tokenAddress, isPersonalToken });
        isLoading = true;

        try {
            // Get the PagedQuery from the SDK based on token type
            let query: any;

            if (isPersonalToken) {
                // Use rpc.token.getTokenHolders for personal tokens
                query = ($circles as any).rpc.token.getTokenHolders(tokenAddress, 1000); // Large page size
                console.log('✅ Created PagedQuery instance for personal token using rpc.token.getTokenHolders');
            } else {
                // Use avatar.group.getHolders for group tokens
                query = avatarState.avatar.group.getHolders(tokenAddress, 1000); // Large page size
                console.log('✅ Created PagedQuery instance for group token using avatar.group.getHolders');
            }

            const holders: HolderRow[] = [];
            let pageNum = 0;

            // Fetch ALL pages from backend
            while (await query.queryNextPage()) {
                pageNum++;
                if (query.currentPage) {
                    holders.push(...query.currentPage.results);
                    console.log(`📄 Loaded page ${pageNum}: ${query.currentPage.results.length} holders (total: ${holders.length}, hasMore: ${query.currentPage.hasMore})`);

                    if (!query.currentPage.hasMore) {
                        break;
                    }
                }
            }

            allHolders = holders;
            currentPage = 0;

            // Display first page
            displayedHolders = allHolders.slice(0, pageSize);
            hasMore = allHolders.length > pageSize;

            initialized = true;
            currentTokenAddress = tokenAddress;

            console.log('✅ All holders loaded:', {
                totalHolders: allHolders.length,
                displayedHolders: displayedHolders.length,
                hasMore,
                pages: Math.ceil(allHolders.length / pageSize)
            });
        } catch (error) {
            console.error('❌ Error loading token holders:', error);
        } finally {
            isLoading = false;
        }
    }

    function loadMore() {
        if (isLoading) {
            console.log('⏸️ loadMore already in progress');
            return;
        }

        if (!hasMore) {
            console.log('⏸️ loadMore skipped: no more data');
            return;
        }

        console.log('🔄 Loading more holders (client-side pagination)...', {
            currentDisplayed: displayedHolders.length,
            total: allHolders.length,
            currentPage
        });

        isLoading = true;

        // Simulate slight delay for UX
        setTimeout(() => {
            currentPage++;
            const startIndex = currentPage * pageSize;
            const endIndex = startIndex + pageSize;
            const newHolders = allHolders.slice(startIndex, endIndex);

            displayedHolders = [...displayedHolders, ...newHolders];
            hasMore = endIndex < allHolders.length;

            console.log('✅ Load more complete:', {
                newHoldersCount: newHolders.length,
                totalDisplayed: displayedHolders.length,
                totalAvailable: allHolders.length,
                hasMore,
                page: currentPage + 1
            });

            isLoading = false;
        }, 100);
    }

    function handleScroll(event: Event) {
        const now = Date.now();

        // Throttle scroll events
        if (now - lastScrollTime < scrollThrottle) {
            return;
        }
        lastScrollTime = now;

        const target = event.target as HTMLDivElement;
        const scrollThreshold = 100; // Start loading 100px before reaching bottom

        const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

        // Only log when close to bottom to reduce noise
        if (distanceToBottom < 300) {
            console.log('📜 Scroll event:', {
                distanceToBottom: Math.round(distanceToBottom),
                scrollThreshold,
                isLoading,
                hasMore,
                shouldLoad: distanceToBottom < scrollThreshold && !isLoading && hasMore
            });
        }

        if (distanceToBottom < scrollThreshold && !isLoading && hasMore) {
            console.log('🎯 Triggering loadMore from scroll');
            loadMore();
        }
    }

    // Helper to check if holder is a personal token holder
    function isPersonalTokenHolder(holder: HolderRow): holder is TokenHolder {
        return 'account' in holder;
    }

    // Get holder address from either type
    function getHolderAddress(holder: HolderRow): Address {
        return isPersonalTokenHolder(holder) ? holder.account : holder.holder;
    }

    // Get demurraged balance from either type
    function getDemurragedBalance(holder: HolderRow): string | bigint {
        return holder.demurragedTotalBalance;
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
        // Check if we have the required dependencies
        const hasRequiredDeps = isPersonalToken ? ($circles && tokenAddress) : (avatarState.avatar && tokenAddress);

        // Only initialize once when we have required dependencies
        if (hasRequiredDeps && !initialized) {
            console.log('🆕 First initialization');
            loadInitialData();
            return;
        }

        // Reload only if the token address actually changed
        if (hasRequiredDeps && initialized && currentTokenAddress !== tokenAddress) {
            console.log('🔄 Token address changed, reloading...', {
                old: currentTokenAddress,
                new: tokenAddress
            });
            allHolders = [];
            displayedHolders = [];
            hasMore = true;
            currentPage = 0;
            initialized = false;
            loadInitialData();
        }
    });
</script>

<div class="bg-white rounded-xl border shadow-sm overflow-hidden">
    <div class="p-6 border-b">
        <h2 class="text-lg font-semibold text-gray-800">Token Holders</h2>
        <div class="flex items-center justify-between mt-1">
            {#if hasMore}
                <p class="text-sm text-gray-500">
                    Scroll for more
                </p>
            {:else}
                <p class="text-sm text-gray-500">
                    All holders loaded
                </p>
            {/if}
            {#if hasMore && !isLoading}
                <button
                    onclick={() => loadMore()}
                    class="btn btn-sm btn-ghost"
                >
                    Load More (Debug)
                </button>
            {/if}
        </div>
    </div>

    <div class="max-h-[600px] overflow-y-auto" onscroll={handleScroll}>
        {#if displayedHolders.length === 0 && !isLoading}
            <div class="p-8 text-center text-gray-500">
                No token holders found
            </div>
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
                                    bottomInfo={!isPersonalToken ? `${formatPercentage(getOwnershipFraction(holder))}% ownership` : ''}
                                />
                            </div>

                            <div class="text-right shrink-0">
                                {#if !isPersonalToken && getTotalBalance(holder)}
                                    <div>
                                        <span class="text-black font-bold">{formatBalance(getTotalBalance(holder))}</span>
                                        <span class="text-gray-500"> CRC</span>
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        {formatBalance(getDemurragedBalance(holder))} demurraged
                                    </div>
                                {:else}
                                    <div>
                                        <span class="text-black font-bold">{formatBalance(getDemurragedBalance(holder))}</span>
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
                    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="text-sm">Loading more holders...</span>
                </div>
            </div>
        {/if}

        {#if !hasMore && displayedHolders.length > 0}
            <div class="p-4 text-center text-sm text-gray-500">
                All {allHolders.length} holders loaded
            </div>
        {/if}
    </div>
</div>
