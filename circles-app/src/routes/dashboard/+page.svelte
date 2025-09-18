<script lang="ts">
    import { avatarState } from '$lib/stores/avatar.svelte';
    import { roundToDecimals } from '$lib/utils/shared';
    import { runTask } from '$lib/utils/tasks';

    import Tabs from '$lib/components/tabs/Tabs.svelte';
    import Tab from '$lib/components/tabs/Tab.svelte';
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

    let mintableAmount: number = $state(0);

    const defaultTab: string = avatarState.isGroup ? 'overview' : 'transaction-history';
    let selectedTab: string = defaultTab;

    $effect(() => {
        (async () => {
            const hasAvatar: boolean = !!avatarState.avatar;
            const isHuman: boolean = hasAvatar && !avatarState.isGroup;

            if (isHuman) {
                const amount = await avatarState.avatar!.getMintableAmount();
                mintableAmount = amount ?? 0;
            }
        })();
    });

    async function mintPersonalCircles() {
        const hasAvatar: boolean = !!avatarState.avatar;
        if (!hasAvatar) {
            throw new Error('Avatar store is not available');
        }

        runTask({
            name: 'Minting Circles ...',
            promise: avatarState.avatar!.personalMint(),
        }).finally(async () => {
            const refreshed = await avatarState.avatar!.getMintableAmount();
            mintableAmount = refreshed ?? 0;
        });

        mintableAmount = 0;
    }

    let personalToken: number = $derived(
        $circlesBalances?.data?.filter((balance) => !balance.isGroup).length
    );
    let groupToken: number = $derived(
        $circlesBalances?.data?.filter((balance) => balance.isGroup).length
    );

    function openBalances() {
        popupControls.open({
            title: "",
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
        <button class="text-left" onclick={openBalances} aria-label="Open balances breakdown">
            <h2 class="h2 m-0">
                {roundToDecimals($totalCirclesBalance)} Circles
            </h2>
        </button>
    </svelte:fragment>

    <!-- Meta -->
    <svelte:fragment slot="meta">
        <span class="hover:underline cursor-pointer" onclick={openBalances}>
            {personalToken} individual tokens
        </span>
        <span class="mx-1.5">•</span>
        <span class="hover:underline cursor-pointer" onclick={openBalances}>
            {groupToken} group tokens
        </span>
    </svelte:fragment>

    <!-- Full-size quick actions -->
    <svelte:fragment slot="actions">
        {#if !avatarState.isGroup}
            <button type="button" class="btn btn-ghost btn-sm" onclick={openSend}>
                <Lucide icon={LSend} size={16} class={`shrink-0 ${ghostIconStrokeClass}`} />
                Send
            </button>
        {/if}

        {#if mintableAmount >= 0.01}
            <button type="button" class="btn btn-primary btn-sm" onclick={mintPersonalCircles}>
                <Lucide icon={LBanknote} size={16} class={`shrink-0 ${primaryIconStrokeClass}`} />
                Mint {roundToDecimals(mintableAmount)} Circles
            </button>
        {/if}
    </svelte:fragment>

    <!-- Collapsed summary (balance only) -->
    <svelte:fragment slot="collapsed-left">
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
        {roundToDecimals($totalCirclesBalance)} Circles
    </span>
    </svelte:fragment>

    <!-- Collapsed dropdown content -->
    <svelte:fragment slot="collapsed-menu">
        <div class="grid grid-cols-1 gap-2">

            {#if mintableAmount >= 0.01}
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
        <Tabs
                id="dashboard-tabs"
                bind:selected={selectedTab}
                defaultValue={defaultTab}
                variant="bordered"
                size="md"
                class="w-full p-0"
        >
            <Tab id="overview" title="Overview" panelClass="p-0 bg-base-100 border-none">
                <OverviewPanel/>
            </Tab>

            <Tab id="transaction-history" title="Transaction History" panelClass="p-0 bg-base-100 border-none">
                <TransactionHistoryPanel/>
            </Tab>
        </Tabs>
    {:else}
        <TransactionHistoryPanel/>
    {/if}
</PageScaffold>
