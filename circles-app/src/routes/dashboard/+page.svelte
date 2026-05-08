<script lang="ts">
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import { runTask } from '$lib/shared/utils/tasks';
    import { isBenignReceiptDecodeError } from '$lib/shared/utils/tx';

    import OverviewPanel from './OverviewPanel.svelte';
    import TransactionHistoryPanel from './TransactionHistoryPanel.svelte';

    import { popupControls } from '$lib/shared/state/popup';
    import Balances from '$lib/areas/wallet/ui/pages/Balances.svelte';
    import { circlesBalances } from '$lib/shared/state/circlesBalances';
    import { totalCirclesBalance } from '$lib/shared/state/totalCirclesBalance';

    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import { openSendFlowPopup } from '$lib/areas/wallet/flows/send/openSendFlowPopup';
    import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';

    import {
        Send as LSend,
        Banknote as LBanknote,
        ArrowDownLeft as LArrowDownLeft,
        UserPlus as LUserPlus,
        ScanLine as LScanLine,
    } from 'lucide';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
    import ReceivePopup from './ReceivePopup.svelte';

    const TOKEN_SOURCES_HELP = [
        'Every person and group can issue its own Circles token.',
        'Your balance is spread across tokens from people and groups you are connected to.',
        'This is normal and expected in Circles.',
    ];

    let mintableAmount: number = $state(0);

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
        if (!avatarState.avatar) throw new Error('Avatar store is not available');
        try {
            await runTask({ name: 'Collecting CRC ...', promise: avatarState.avatar!.personalMint() });
        } catch (error) {
            if (!isBenignReceiptDecodeError(error)) throw error;
            console.warn('Ignoring benign receipt decode error after successful mint transaction', error);
        } finally {
            const refreshed = await avatarState.avatar!.getMintableAmount();
            mintableAmount = refreshed ?? 0;
        }
        mintableAmount = 0;
    }

    let personalToken: number = $derived(
        $circlesBalances?.data?.filter((b) => !b.isGroup).length ?? 0
    );
    let groupToken: number = $derived(
        $circlesBalances?.data?.filter((b) => b.isGroup).length ?? 0
    );
    let personalBalance: number = $derived(
        $circlesBalances?.data?.filter((b) => !b.isGroup).reduce((s, b) => s + (b.circles ?? 0), 0) ?? 0
    );
    let groupBalance: number = $derived(
        $circlesBalances?.data?.filter((b) => b.isGroup).reduce((s, b) => s + (b.circles ?? 0), 0) ?? 0
    );

    function openBalances() {
        popupControls.open({ title: 'Balance breakdown', component: Balances, props: {} });
    }

    function openSend() {
        openSendFlowPopup({ selectedAddress: undefined, amount: undefined, transitiveOnly: true });
    }

    function openReceive() {
        popupControls.open({ title: 'Receive', component: ReceivePopup, props: {} });
    }

    function openTrust() {
        if (!avatarState.avatar) return;
        openAddTrustFlow({
            context: {
                actorType: avatarState.isGroup ? 'group' : 'avatar',
                actorAddress: avatarState.avatar.address,
                selectedTrustees: [],
            },
        });
    }

    function openScanQR() {
        openSendFlowPopup({ selectedAddress: undefined, amount: undefined, transitiveOnly: true });
    }
</script>

<PageScaffold
    highlight="soft"
    maxWidthClass="page page--lg"
    contentWidthClass="page page--lg"
    usePagePadding={true}
    collapsedMode="bar"
    collapsedHeightClass="h-12"
    headerCardStyle="background:radial-gradient(120% 140% at 100% 0%, #EEEBFA 0%, #FFFFFF 62%);"
>
    {#snippet title()}
        {#if !avatarState.isGroup}
            <div>
                <div class="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1" style="color:rgba(15,10,30,0.50);">Total balance</div>
                <button class="text-left group" onclick={openBalances} aria-label="Open balances breakdown">
                    <span class="h1-display block group-hover:opacity-80 transition-opacity">
                        {roundToDecimals($totalCirclesBalance)}<span style="font-family:'Inter Tight',sans-serif;font-size:0.42em;font-weight:500;opacity:0.55;margin-left:0.35em;vertical-align:0.1em;letter-spacing:0;">CRC</span>
                    </span>
                </button>
            </div>
        {:else}
            <h2 class="h2 m-0">Group overview</h2>
        {/if}
    {/snippet}

    {#snippet meta()}
        {#if !avatarState.isGroup}
            <button type="button" class="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer text-left" onclick={openBalances}>
                <span class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#E8896A;"></span>
                    <span class="text-[13px]"><b>{personalToken}</b> people</span>
                </span>
                <span style="color:rgba(15,10,30,0.20);">·</span>
                <span class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#5849D4;"></span>
                    <span class="text-[13px]"><b>{groupToken}</b> groups</span>
                </span>
                <HelpPopover
                    title="Why so many tokens?"
                    lines={TOKEN_SOURCES_HELP}
                    buttonClass="btn btn-ghost btn-xs btn-square"
                    widthClass="w-80"
                />
            </button>
        {/if}
    {/snippet}

    {#snippet headerActions()}
        {#if !avatarState.isGroup}
            <div class="w-full grid grid-cols-4 gap-2">
                <button
                    type="button"
                    class="flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 rounded-[12px] text-white font-semibold text-[11px] cursor-pointer transition-opacity hover:opacity-90"
                    style="background:#5849D4;"
                    onclick={openSend}
                >
                    <Lucide icon={LSend} size={17} class="shrink-0" />
                    <span>Send</span>
                </button>
                <button
                    type="button"
                    class="flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 rounded-[12px] bg-base-100 border border-base-300 font-semibold text-[11px] cursor-pointer hover:bg-base-200 transition-colors"
                    onclick={openReceive}
                >
                    <Lucide icon={LArrowDownLeft} size={17} class="shrink-0" />
                    <span>Receive</span>
                </button>
                <button
                    type="button"
                    class="flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 rounded-[12px] bg-base-100 border border-base-300 font-semibold text-[11px] cursor-pointer hover:bg-base-200 transition-colors"
                    onclick={openTrust}
                >
                    <Lucide icon={LUserPlus} size={17} class="shrink-0" />
                    <span>Trust</span>
                </button>
                <button
                    type="button"
                    class="flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 rounded-[12px] bg-base-100 border border-base-300 font-semibold text-[11px] cursor-pointer hover:bg-base-200 transition-colors"
                    onclick={openScanQR}
                >
                    <Lucide icon={LScanLine} size={17} class="shrink-0" />
                    <span>Scan</span>
                </button>
            </div>
        {/if}
    {/snippet}

    {#snippet collapsedLeft()}
        {#if !avatarState.isGroup}
            <span class="font-display text-[1.15rem] font-normal tracking-tight text-base-content">
                {roundToDecimals($totalCirclesBalance)} CRC
            </span>
        {:else}
            <span class="font-display text-[1.15rem] font-normal tracking-tight text-base-content">
                Group overview
            </span>
        {/if}
    {/snippet}

    {#snippet collapsedMenu()}
        <div class="grid grid-cols-1 gap-2">
            {#if mintableAmount >= 0.01}
                <button type="button"
                    class="btn btn-primary min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                    onclick={mintPersonalCircles}>
                    <Lucide icon={LBanknote} size={20} class="shrink-0" />
                    Mint {roundToDecimals(mintableAmount)} Circles
                </button>
            {/if}
            {#if !avatarState.isGroup}
                <button type="button"
                    class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                    onclick={openSend}>
                    <Lucide icon={LSend} size={20} class="shrink-0" />
                    Send
                </button>
                <button type="button"
                    class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
                    onclick={openReceive}>
                    <Lucide icon={LArrowDownLeft} size={20} class="shrink-0" />
                    Receive
                </button>
            {/if}
        </div>
    {/snippet}

    <!-- Balance breakdown bar -->
    {#if !avatarState.isGroup && ($circlesBalances?.data?.length ?? 0) > 0}
        <div class="grid grid-cols-2 sm:grid-cols-3 bg-base-100 border border-base-300 rounded-[14px] overflow-hidden mb-4"
             style="box-shadow:0 1px 2px rgba(15,10,30,0.04);">
            <button type="button"
                class="flex flex-col gap-1.5 p-4 border-r border-base-300 text-left hover:bg-base-200 transition-colors"
                onclick={openBalances}>
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-sm shrink-0" style="background:#F4D27A;"></span>
                    <span class="text-[10.5px] font-semibold tracking-[0.07em] uppercase" style="color:rgba(15,10,30,0.50);">Personal</span>
                </div>
                <div class="font-mono text-[15px] font-semibold tabular-nums leading-none">
                    {roundToDecimals(personalBalance)}<span class="text-[10px] font-normal opacity-50 ml-0.5">CRC</span>
                </div>
                <div class="text-[11.5px]" style="color:rgba(15,10,30,0.50);">{personalToken} issuers</div>
            </button>

            <button type="button"
                class="flex flex-col gap-1.5 p-4 sm:border-r border-base-300 text-left hover:bg-base-200 transition-colors"
                onclick={openBalances}>
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-sm shrink-0" style="background:#5849D4;"></span>
                    <span class="text-[10.5px] font-semibold tracking-[0.07em] uppercase" style="color:rgba(15,10,30,0.50);">Groups</span>
                </div>
                <div class="font-mono text-[15px] font-semibold tabular-nums leading-none">
                    {roundToDecimals(groupBalance)}<span class="text-[10px] font-normal opacity-50 ml-0.5">CRC</span>
                </div>
                <div class="text-[11.5px]" style="color:rgba(15,10,30,0.50);">{groupToken} groups</div>
            </button>

            {#if mintableAmount >= 0.01}
                <button type="button"
                    class="flex flex-col gap-1.5 p-4 col-span-2 sm:col-span-1 border-t sm:border-t-0 border-base-300 text-left hover:bg-base-200 transition-colors"
                    onclick={mintPersonalCircles}>
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-sm shrink-0" style="background:#7BA887;"></span>
                        <span class="text-[10.5px] font-semibold tracking-[0.07em] uppercase" style="color:rgba(15,10,30,0.50);">Mintable now</span>
                    </div>
                    <div class="font-mono text-[15px] font-semibold tabular-nums leading-none text-success">
                        {roundToDecimals(mintableAmount)}<span class="text-[10px] font-normal opacity-60 ml-0.5">CRC</span>
                    </div>
                    <div class="text-[11.5px] font-semibold" style="color:#2D8A52;">Mint →</div>
                </button>
            {/if}
        </div>
    {/if}

    {#if avatarState.isGroup}
        <OverviewPanel/>
    {:else}
        <!-- Mintable nudge card -->
        {#if mintableAmount >= 0.01}
            <button
                type="button"
                class="w-full text-left rounded-[14px] mb-4 px-4 py-3.5 flex items-center justify-between cursor-pointer transition-opacity hover:opacity-90"
                style="background:linear-gradient(160deg,#FBE3D8 0%,#EEEBFA 100%);"
                onclick={mintPersonalCircles}
            >
                <div>
                    <div class="text-[10.5px] font-semibold tracking-[0.07em] uppercase mb-0.5" style="color:rgba(15,10,30,0.50);">Available to mint</div>
                    <div class="font-mono text-[18px] font-semibold tabular-nums leading-tight" style="color:#5849D4;">
                        {roundToDecimals(mintableAmount)} <span class="text-[13px] font-medium opacity-60">CRC</span>
                    </div>
                </div>
                <div class="font-semibold text-[13px]" style="color:#5849D4;">Mint →</div>
            </button>
        {/if}

        <!-- Activity card -->
        <div class="bg-base-100 border border-base-300 rounded-[20px] overflow-hidden"
             style="box-shadow:0 1px 4px rgba(15,10,30,0.04);">
            <div class="px-4 pt-3.5 pb-2 border-b border-base-300">
                <span class="text-[10.5px] font-semibold tracking-[0.07em] uppercase" style="color:rgba(15,10,30,0.45);">Activity</span>
            </div>
            <TransactionHistoryPanel/>
        </div>
    {/if}
</PageScaffold>
