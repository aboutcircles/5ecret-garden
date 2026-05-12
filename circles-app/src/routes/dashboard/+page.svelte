<script lang="ts">
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import { executeTxConfirmFirst } from '$lib/shared/utils/txExecution';
    import { isBenignReceiptDecodeError } from '$lib/shared/utils/tx';

    import OverviewPanel from './OverviewPanel.svelte';
    import TransactionHistoryPanel from './TransactionHistoryPanel.svelte';

    import { popupControls } from '$lib/shared/state/popup';
    import { ethers } from 'ethers';
    import Balances from '$lib/areas/wallet/ui/pages/Balances.svelte';
    import { circlesBalances } from '$lib/shared/state/circlesBalances';
    import { totalCirclesBalance } from '$lib/shared/state/totalCirclesBalance';
    import { refreshTransactionHistory } from '$lib/shared/state/transactionHistory';
    import { buildGroupOwnerSet } from '$lib/shared/utils/tokenClassification';

    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import { openSendFlowPopup } from '$lib/areas/wallet/flows/send/openSendFlowPopup';
    import { HumanAvatar } from '@aboutcircles/sdk';

    // lucide (standalone) icon nodes
    import { Send as LSend, Banknote as LBanknote, BarChart3 as LBarChart3, ArrowLeftRight as LArrowLeftRight, ArrowUpDown as LArrowUpDown } from 'lucide';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
    import TrustEventsPanel from './TrustEventsPanel.svelte';

    const TOKEN_SOURCES_HELP = [
        'Every person and group can issue its own Circles token.',
        'Your balance is spread across tokens from people and groups you are connected to.',
        'This is normal and expected in Circles.',
    ];

    let mintableAmount: number = $state(0);

    const defaultTab: string = avatarState.isGroup ? 'overview' : 'transaction-history';
    let selectedTab: string = $state(defaultTab);

    $effect(() => {
        (async () => {
            const avatar = avatarState.avatar;
            if (avatar instanceof HumanAvatar) {
                const result = await avatar.personalToken.getMintableAmount();
                mintableAmount = result?.amount ? parseFloat(ethers.formatEther(result.amount)) : 0;
            }
        })();
    });

    async function mintPersonalCircles() {
        const avatar = avatarState.avatar;
        if (!(avatar instanceof HumanAvatar)) {
            throw new Error('Avatar is not a HumanAvatar');
        }

        try {
            await executeTxConfirmFirst({
                name: 'Collecting CRC ...',
                submit: () => avatar.personalToken.mint(),
            });
        } catch (error) {
            if (!isBenignReceiptDecodeError(error)) {
                throw error;
            }
            console.warn('Ignoring benign receipt decode error after successful mint transaction', error);
        } finally {
            const refreshed = await avatar.personalToken.getMintableAmount();
            mintableAmount = refreshed?.amount ? parseFloat(ethers.formatEther(refreshed.amount)) : 0;
        }

        mintableAmount = 0;

        // Refresh tx history so the mint appears immediately
        refreshTransactionHistory();
    }

    // Match the dust filter in Balances.svelte so the count matches the breakdown
    const DUST_THRESHOLD = 10_000_000_000_000_000n; // 0.01 CRC

    // Build group owner set from ALL balances (including dust) for accurate classification
    let groupOwners: Set<string> = $derived(
        buildGroupOwnerSet($circlesBalances?.data ?? [])
    );

    let personalToken: number = $derived(
        $circlesBalances?.data?.filter((balance) =>
            !groupOwners.has(balance.tokenOwner?.toLowerCase?.() ?? '') &&
            BigInt(balance.attoCircles) >= DUST_THRESHOLD
        ).length
    );
    let groupToken: number = $derived(
        $circlesBalances?.data?.filter((balance) =>
            groupOwners.has(balance.tokenOwner?.toLowerCase?.() ?? '') &&
            BigInt(balance.attoCircles) >= DUST_THRESHOLD
        ).length
    );

    function openBalances() {
        popupControls.open({
            title: 'Balance breakdown',
            component: Balances,
            props: {}
        });
    }

    function openSend() {
        openSendFlowPopup({
            selectedAddress: undefined,
            amount: undefined,
            transitiveOnly: true
        });
    }

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
    {#snippet title()}
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
    {/snippet}

    <!-- Meta -->
    {#snippet meta()}
        {#if !avatarState.isGroup}
            <span class="inline-flex items-center flex-wrap gap-y-1">
                <button type="button" class="hover:underline cursor-pointer text-left" onclick={openBalances}>
                    From {personalToken} people
                </button>
                <span class="mx-1.5" aria-hidden="true">•</span>
                <button type="button" class="hover:underline cursor-pointer text-left" onclick={openBalances}>
                    {groupToken} groups
                </button>
                <HelpPopover
                    title="Why so many tokens?"
                    lines={TOKEN_SOURCES_HELP}
                    buttonClass="btn btn-ghost btn-xs btn-square"
                    widthClass="w-80"
                />
            </span>
        {/if}
    {/snippet}

    <!-- Full-size quick actions -->
    {#snippet headerActions()}
        {#if !avatarState.isGroup}
            <button type="button" class="btn btn-ghost btn-sm" onclick={openSend}>
                <Lucide icon={LSend} size={16} class="shrink-0" />
                Send
            </button>
        {/if}

        {#if mintableAmount >= 0.01}
            <button type="button" class="btn btn-primary btn-sm" onclick={mintPersonalCircles}>
                <Lucide icon={LBanknote} size={16} class="shrink-0" />
                Mint {roundToDecimals(mintableAmount)} Circles
            </button>
        {/if}
    {/snippet}

    <!-- Collapsed summary (balance only) -->
    {#snippet collapsedLeft()}
        {#if !avatarState.isGroup}
        <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
            {roundToDecimals($totalCirclesBalance)} Circles
        </span>
        {:else}
            <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
                Group overview
            </span>
        {/if}
    {/snippet}

    <!-- Collapsed dropdown content -->
    {#snippet collapsedMenu()}
        <div class="grid grid-cols-1 gap-2">

            {#if mintableAmount >= 0.01}
                <button
                        type="button"
                        class="btn btn-primary min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                        onclick={mintPersonalCircles}
                >
                    <Lucide icon={LBanknote} size={20} class="shrink-0" />
                    Mint {roundToDecimals(mintableAmount)} Circles
                </button>
            {/if}

            {#if !avatarState.isGroup}
                <button
                        type="button"
                        class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                        onclick={openSend}
                >
                    <Lucide icon={LSend} size={20} class="shrink-0" />
                    Send
                </button>
            {/if}

            <button
                    type="button"
                    class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                    onclick={openBalances}
            >
                <Lucide icon={LBarChart3} size={20} class="shrink-0" />
                See breakdown
            </button>
        </div>
    {/snippet}

    <!-- Content -->
    {#if avatarState.isGroup}
        <OverviewPanel/>
    {:else}
        <div role="tablist" class="tabs tabs-bordered mb-4">
            <button
                role="tab"
                class="tab"
                class:tab-active={selectedTab === 'transaction-history'}
                onclick={() => selectedTab = 'transaction-history'}
            >
                <Lucide icon={LArrowUpDown} size={14} class="mr-1" />
                Transactions
            </button>
            <button
                role="tab"
                class="tab"
                class:tab-active={selectedTab === 'trusts'}
                onclick={() => selectedTab = 'trusts'}
            >
                <Lucide icon={LArrowLeftRight} size={14} class="mr-1" />
                Trusts
            </button>
        </div>

        {#if selectedTab === 'transaction-history'}
            <TransactionHistoryPanel/>
        {:else if selectedTab === 'trusts'}
            <TrustEventsPanel/>
        {/if}
    {/if}
</PageScaffold>
