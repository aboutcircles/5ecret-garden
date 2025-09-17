<script lang="ts">
    import TotalBalance from '$lib/components/TotalBalance.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {roundToDecimals} from '$lib/utils/shared';
    import {runTask} from '$lib/utils/tasks';

    import Tabs from '$lib/components/tabs/Tabs.svelte';
    import Tab from '$lib/components/tabs/Tab.svelte';

    import OverviewPanel from './OverviewPanel.svelte';
    import TransactionHistoryPanel from './TransactionHistoryPanel.svelte';
    import {popupControls} from "$lib/stores/popUp";
    import Balances from "$lib/pages/Balances.svelte";
    import {circlesBalances} from '$lib/stores/circlesBalances';
    import {totalCirclesBalance} from '$lib/stores/totalCirclesBalance';

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
        })
    }
</script>

<div class="page page-pt page-stack page--lg">
    <div>
        <a class="h2 cursor-pointer" onclick={openBalances}>{roundToDecimals($totalCirclesBalance)} Circles</a>
        <p>
            <a onclick={openBalances} class="text-sm cursor-pointer text-gray-500">
                {personalToken} individual tokens • {groupToken} group tokens
            </a>
        </p>
    </div>


    {#if mintableAmount >= 0.01}
        <button class="btn btn-sm btn-primary" onclick={mintPersonalCircles}>
            Mint {roundToDecimals(mintableAmount)} Circles
        </button>
    {/if}

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
        <!-- No tabs for non-group: embed the shared panel directly -->
        <TransactionHistoryPanel/>
    {/if}
</div>
