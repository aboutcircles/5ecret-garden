<script lang="ts">
    import { CirclesConverter } from '@circles-sdk-v2/utils';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import { roundToDecimals } from '$lib/utils/shared';
    import { runTask } from '$lib/utils/tasks';

    import OverviewPanel from './OverviewPanel.svelte';
    import TransactionHistoryPanel from './TransactionHistoryPanel.svelte';

    import { popupControls } from '$lib/stores/popUp';
    import Balances from '$lib/pages/Balances.svelte';
    import { circlesBalances } from '$lib/stores/circlesBalances';
    import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';

    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import Send from '$lib/flows/send/1_To.svelte';

    // lucide (standalone) icon nodes
    import { Send as LSend, Banknote as LBanknote, BarChart3 as LBarChart3 } from 'lucide';
    import Lucide from '$lib/icons/Lucide.svelte';

    import { circles } from '$lib/stores/circles';
    import { initTransactionHistoryStore } from '$lib/stores/transactionHistory';
    import type { CirclesEvent } from '@circles-sdk-v2/rpc';

    let mintableAmount: number = $state(0);
    let unsubscribeEvents: (() => void) | null = null;

    // Single unified effect for event subscription and initial data load
    $effect(() => {
        (async () => {
            // Cleanup previous subscription
            if (unsubscribeEvents) {
                unsubscribeEvents();
                unsubscribeEvents = null;
            }

            if (!$circles || !avatarState.avatar) {
                return;
            }

            const avatarAddress = avatarState.avatar.address;
            if (!avatarAddress) {
                return;
            }

            try {
                // Initial load for humans
                if (avatarState.isHuman && avatarState.avatar) {
                    try {
                        const result = await avatarState.avatar.personalToken.getMintableAmount();
                        const amount = CirclesConverter.attoCirclesToCircles(result.amount);
                        mintableAmount = amount ?? 0;
                    } catch (error) {
                        console.error('Failed to load initial mintable amount:', error);
                        mintableAmount = 0;
                    }
                }

                console.log('🔔 Setting up event subscription for avatar:', avatarAddress);

                // Subscribe to events for this avatar
                const observable = await $circles.rpc.client.subscribe(avatarAddress);

                unsubscribeEvents = observable.subscribe(async (event: CirclesEvent) => {
                    try {
                        console.log('📥 Received event:', event.$event, event);

                        // Handle transaction-related events
                        // Note: Balance store handles its own events automatically in +layout.svelte
                        // But transaction history store needs manual refresh
                        const transactionEvents = [
                            'CrcV2_TransferSingle',
                            'CrcV2_TransferBatch',
                            'CrcV2_PersonalMint',
                            'CrcV2_GroupMint',
                            'CrcV2_StreamCompleted',
                            'CrcV2_TransferSummary'
                        ];

                        if (transactionEvents.includes(event.$event)) {
                            console.log('🔄 Transaction event detected, refreshing transaction history...');

                            // Refresh transaction history (it doesn't have built-in event handling)
                            if (avatarState.avatar) {
                                await initTransactionHistoryStore(avatarState.avatar as any);
                            }

                            // Update mintable amount for personal mints
                            if (event.$event === 'CrcV2_PersonalMint' && avatarState.isHuman && avatarState.avatar) {
                                try {
                                    const result = await avatarState.avatar.personalToken.getMintableAmount();
                                    const amount = CirclesConverter.attoCirclesToCircles(result.amount);
                                    mintableAmount = amount ?? 0;
                                } catch (error) {
                                    console.error('Failed to update mintable amount:', error);
                                }
                            }
                        }

                        // Log other events for debugging/future features
                        if (event.$event === 'CrcV2_Trust') {
                            console.log('🤝 Trust event detected');
                        }

                        if (event.$event === 'CrcV2_RegisterGroup' || event.$event === 'CrcV2_InviteHuman') {
                            console.log('👥 Group event detected');
                        }
                    } catch (error) {
                        console.error('❌ Error handling event:', error, event);
                        // Don't rethrow - keep subscription alive
                    }
                });

                console.log('✅ Event subscription established');
            } catch (error) {
                console.error('❌ Failed to set up event subscription:', error);
            }
        })();

        // Cleanup on component destroy or when avatar changes
        return () => {
            if (unsubscribeEvents) {
                console.log('🔕 Unsubscribing from events');
                unsubscribeEvents();
                unsubscribeEvents = null;
            }
        };
    });

    async function mintPersonalCircles() {
        if (!avatarState.avatar || !avatarState.isHuman) {
            throw new Error('Avatar is not a human or not available');
        }

        // Set to 0 immediately for UI feedback
        mintableAmount = 0;

        // Execute mint task
        // The PersonalMint event will update mintableAmount automatically via subscription
        runTask({
            name: 'Minting Circles ...',
            promise: avatarState.avatar.personalToken.mint(),
        });
    }

    let personalToken: number = $derived(
        $circlesBalances?.data?.filter((balance) => !balance.isGroup).length
    );
    let groupToken: number = $derived(
        $circlesBalances?.data?.filter((balance) => balance.isGroup).length
    );

    function openBalances() {
        popupControls.open({
            title: 'Balance breakdown',
            component: Balances,
            props: {}
        });
    }

    function openSend() {
        popupControls.open({
            title: 'Send Circles',
            component: Send,
            props: {},
        });
    }

    // Stroke policy
    const ghostIconStrokeClass: string = 'stroke-black';
    const primaryIconStrokeClass: string = 'stroke-white';
</script>

<PageScaffold
        highlight="soft"
        maxWidthClass="page page--lg"
        contentWidthClass="page page--lg"
        usePagePadding={true}
        collapsedMode="bar"
        collapsedHeightClass="h-12"
        headerTopGapClass="mt-4 md:mt-6"
        collapsedTopGapClass="mt-3 md:mt-4"
>
    <!-- Title -->
    <svelte:fragment slot="title">
        {#if !avatarState.isGroup}
            <button class="text-left" onclick={openBalances} aria-label="Open balances breakdown">
                <h2 class="h2 m-0">
                    {roundToDecimals($totalCirclesBalance)} Circles
                </h2>
            </button>
        {:else}
            <h2 class="h2 m-0">
                Group overview
            </h2>
        {/if}
    </svelte:fragment>

    <!-- Meta -->
    <svelte:fragment slot="meta">
        {#if !avatarState.isGroup}
            <button class="hover:underline" onclick={openBalances} type="button">
                {personalToken} individual tokens
            </button>
            <span class="mx-1.5">•</span>
            <button class="hover:underline" onclick={openBalances} type="button">
                {groupToken} group tokens
            </button>
        {/if}
    </svelte:fragment>

    <!-- Full-size quick actions -->
    <svelte:fragment slot="actions">
        {#if !avatarState.isGroup}
            <button type="button" class="btn btn-ghost btn-sm" onclick={openSend}>
                <Lucide icon={LSend} size={16} class={`shrink-0 ${ghostIconStrokeClass}`} />
                Send
            </button>
        {/if}

        {#if avatarState.isHuman && mintableAmount >= 0.01}
            <button type="button" class="btn btn-primary btn-sm" onclick={mintPersonalCircles}>
                <Lucide icon={LBanknote} size={16} class={`shrink-0 ${primaryIconStrokeClass}`} />
                Mint {roundToDecimals(mintableAmount)} Circles
            </button>
        {/if}
    </svelte:fragment>

    <!-- Collapsed summary (balance only) -->
    <svelte:fragment slot="collapsed-left">
        {#if !avatarState.isGroup}
        <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
            {roundToDecimals($totalCirclesBalance)} Circles
        </span>
        {:else}
            <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
                Group overview
            </span>
        {/if}
    </svelte:fragment>

    <!-- Collapsed dropdown content -->
    <svelte:fragment slot="collapsed-menu">
        <div class="grid grid-cols-1 gap-2">

            {#if avatarState.isHuman && mintableAmount >= 0.01}
                <button
                        type="button"
                        class="btn btn-primary min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                        onclick={mintPersonalCircles}
                >
                    <Lucide icon={LBanknote} size={20} class={`shrink-0 ${primaryIconStrokeClass}`} />
                    Mint {roundToDecimals(mintableAmount)} Circles
                </button>
            {/if}

            {#if !avatarState.isGroup}
                <button
                        type="button"
                        class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                        onclick={openSend}
                >
                    <Lucide icon={LSend} size={20} class={`shrink-0 ${ghostIconStrokeClass}`} />
                    Send
                </button>
            {/if}

            <button
                    type="button"
                    class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                    onclick={openBalances}
            >
                <Lucide icon={LBarChart3} size={20} class={`shrink-0 ${ghostIconStrokeClass}`} />
                See breakdown
            </button>
        </div>
    </svelte:fragment>

    <!-- Content -->
    {#if avatarState.isGroup}
        <OverviewPanel/>
    {:else}
        <TransactionHistoryPanel/>
    {/if}
</PageScaffold>
