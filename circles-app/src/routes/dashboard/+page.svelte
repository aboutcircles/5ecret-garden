<script lang="ts">
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';

    import OverviewPanel from './OverviewPanel.svelte';
    import TransactionRow from './TransactionRow.svelte';
    import VirtualList from '$lib/shared/ui/lists/VirtualList.svelte';
    import TransactionRowPlaceholder from '$lib/shared/ui/lists/placeholders/TransactionRowPlaceholder.svelte';

    import { popupControls } from '$lib/shared/state/popup';
    import { ethers } from 'ethers';
    import Balances from '$lib/areas/wallet/ui/pages/Balances.svelte';
    import { circlesBalances } from '$lib/shared/state/circlesBalances';
    import { totalCirclesBalance } from '$lib/shared/state/totalCirclesBalance';
    import { groupedTransactionHistory } from '$lib/shared/state/transactionHistory';
    import { buildGroupOwnerSet } from '$lib/shared/utils/tokenClassification';

    import { openSendFlowPopup } from '$lib/areas/wallet/flows/send/openSendFlowPopup';
    import { HumanAvatar } from '@aboutcircles/sdk';
    import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
    import ReceivePopup from './ReceivePopup.svelte';
    import MintPopup from './MintPopup.svelte';
    import MigrateLegacyGroupBanner from '$lib/areas/minting/ui/MigrateLegacyGroupBanner.svelte';

    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
    import DashboardFlowStrip from './DashboardFlowStrip.svelte';
    import DashboardTrustCard from './DashboardTrustCard.svelte';
    import DashboardSpendingCard from './DashboardSpendingCard.svelte';

    let mintableAmount: number = $state(0);
    // Whether the (async) mintable check has resolved. Lets the dashboard RESERVE the
    // nudge's slot while pending instead of letting it pop in and shove the activity list
    // down once it resolves. Non-human avatars never mint, so they resolve immediately.
    let mintableChecked: boolean = $state(false);

    $effect(() => {
        (async () => {
            const avatar = avatarState.avatar;
            if (avatar instanceof HumanAvatar) {
                try {
                    const result = await avatar.personalToken.getMintableAmount();
                    mintableAmount = result?.amount ? parseFloat(ethers.formatEther(result.amount)) : 0;
                } finally {
                    mintableChecked = true;
                }
            } else {
                mintableAmount = 0;
                mintableChecked = true;
            }
        })();
    });

    function openMintPopup() {
        popupControls.open({
            title: 'Mint',
            kind: 'inspect',
            component: MintPopup,
            props: {
                initialAmount: mintableAmount,
                onMinted: (next: number) => { mintableAmount = next; },
            },
        });
    }

    // Build group owner set from ALL balances (including dust) for accurate classification
    let groupOwners: Set<string> = $derived(
        buildGroupOwnerSet($circlesBalances?.data ?? [])
    );

    // CRC amounts (not counts) for the personal vs group split shown under the total.
    // Sum each balance's demurraged `circles` value; personal + group == totalCirclesBalance.
    let personalCrcAmount: number = $derived(
        ($circlesBalances?.data ?? []).reduce(
            (acc, b) =>
                acc + (groupOwners.has(b.tokenOwner?.toLowerCase?.() ?? '') ? 0 : (b.circles ?? 0)),
            0,
        )
    );
    let groupCrcAmount: number = $derived(
        ($circlesBalances?.data ?? []).reduce(
            (acc, b) =>
                acc + (groupOwners.has(b.tokenOwner?.toLowerCase?.() ?? '') ? (b.circles ?? 0) : 0),
            0,
        )
    );

    // Toggles the inline (i) explainer for the personal vs group CRC split (works on mobile).
    let showBalanceInfo: boolean = $state(false);

    const balanceLoaded = $derived(
        ($circlesBalances?.data?.length ?? 0) > 0 || ($circlesBalances?.ended ?? false),
    );

    function openBalances(initialFilterType?: 'personal' | 'group') {
        popupControls.open({
            title: initialFilterType === 'group' ? 'Group balances' : initialFilterType === 'personal' ? 'Personal balances' : 'Balance breakdown',
            component: Balances,
            props: { initialFilterType },
        });
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

    const TRANSACTION_ROW_HEIGHT = 84;
</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">

{#if avatarState.isGroup}
    <div class="px-4 md:px-9 py-4 md:py-7 max-w-[1280px] mx-auto">
        <OverviewPanel/>
    </div>
{:else}
    <!-- Mobile: 18px padding. Desktop: 36px. -->
    <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

        <!-- Legacy group-CRC migration offer (renders only when migratable). -->
        <MigrateLegacyGroupBanner />

        <!-- ─── HERO CARD ─────────────────────────────────────────────── -->
        <div
            class="hero-card"
            style="
                padding:24px 22px 22px;
                border-radius:24px;
                background:radial-gradient(120% 140% at 100% 0%, {T.lilacSoft} 0%, {T.surface} 65%);
                border:1px solid {T.hairlineSoft};
                box-shadow:{T.shadow.sm};
                overflow:hidden;
            "
        >
            <!-- TOP: "Total balance" eyebrow + window switcher (right) + net/buckets — the
                 flow strip owns its own header row and skeleton (replaced the old today pill). -->
            <DashboardFlowStrip />

            <!-- BIG NUMBER -->
            <button
                onclick={() => openBalances()}
                aria-label="Open balance breakdown"
                class="btn-naked"
                style="
                    background:transparent;border:0;padding:0;cursor:pointer;text-align:left;display:block;
                    margin-top:14px;
                "
            >
                <span style="font-family:{T.fontDisplay};font-size:64px;line-height:1.05;color:{T.ink};letter-spacing:-0.015em;font-weight:500;display:inline-flex;align-items:baseline;">
                    {#if balanceLoaded}
                        {roundToDecimals($totalCirclesBalance)}
                    {:else}
                        <span class="balance-skel" style="display:inline-block;width:160px;height:0.7em;background:rgba(15,10,30,0.08);border-radius:10px;"></span>
                    {/if}
                    <span style="margin-left:8px;font-family:{T.fontSans};font-size:16px;font-weight:500;color:{T.inkMuted};">CRC</span>
                </span>
            </button>

            <!-- LEGEND DOTS — min-height matches the loaded single-line height (24px) so the
                 skeleton→content reveal is height-stable and doesn't nudge rows below it. -->
            <div style="display:flex;align-items:center;gap:14px;margin-top:14px;flex-wrap:wrap;min-height:24px;">
                {#if !balanceLoaded}
                    <span class="balance-skel" style="display:inline-block;width:200px;height:14px;background:rgba(15,10,30,0.06);border-radius:7px;"></span>
                {:else}
                <button onclick={() => openBalances('personal')} class="btn-naked" style="background:transparent;border:0;padding:0;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    <span style="width:6px;height:6px;border-radius:3px;background:{T.coral};display:inline-block;"></span>
                    <span style="font-size:13px;color:{T.inkBody};"><b style="color:{T.ink};">{roundToDecimals(personalCrcAmount)}</b> personal</span>
                </button>
                <span style="color:{T.inkFaint};">·</span>
                <button onclick={() => openBalances('group')} class="btn-naked" style="background:transparent;border:0;padding:0;cursor:pointer;display:flex;align-items:center;gap:6px;">
                    <span style="width:6px;height:6px;border-radius:3px;background:{T.primary};display:inline-block;"></span>
                    <span style="font-size:13px;color:{T.inkBody};"><b style="color:{T.ink};">{roundToDecimals(groupCrcAmount)}</b> gCRC</span>
                </button>
                <button
                    onclick={() => (showBalanceInfo = !showBalanceInfo)}
                    class="btn-naked"
                    aria-label="What is personal vs group CRC?"
                    title="What is personal vs group CRC?"
                    aria-expanded={showBalanceInfo}
                    style="background:transparent;border:0;padding:0;cursor:pointer;display:inline-flex;align-items:center;color:{T.inkMuted};"
                >
                    <Icon name="info" size={14} stroke={T.inkMuted} />
                </button>
                {#if mintableAmount >= 0.01}
                    <span style="color:{T.inkFaint};">·</span>
                    <button onclick={() => openMintPopup()} class="btn-naked" style="background:transparent;border:0;padding:0;cursor:pointer;display:flex;align-items:center;gap:6px;">
                        <span style="width:6px;height:6px;border-radius:3px;background:{T.sage};display:inline-block;"></span>
                        <span style="font-size:13px;color:{T.inkBody};">mintable <b style="color:{T.ink};">{roundToDecimals(mintableAmount)}</b></span>
                    </button>
                {/if}
                {/if}
            </div>

            {#if showBalanceInfo}
                <!-- Explainer toggled by the (i) next to the personal/gCRC split. -->
                <div style="margin-top:10px;padding:11px 13px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};font-size:12px;color:{T.inkBody};line-height:1.55;">
                    <b style="color:{T.ink};">Personal CRC</b> — Circles minted by you and the people you trust.
                    <br />
                    <b style="color:{T.ink};">Group CRC (gCRC)</b> — personal CRC you converted into a group's currency. It stays backed by that collateral and holds value, but isn't directly redeemable back to personal CRC; you can transfer or trade it.
                </div>
            {/if}

            <!-- ACTION ROW -->
            <div style="display:flex;align-items:center;gap:8px;margin-top:18px;">
                {#each [
                    { label: 'Send',    icon: 'send',    primary: true,  onClick: openSend },
                    { label: 'Receive', icon: 'receive', primary: false, onClick: openReceive },
                    { label: 'Trust',   icon: 'trust',   primary: false, onClick: openTrust },
                ] as a}
                    <button
                        onclick={a.onClick}
                        style="
                            flex:1;height:56px;border-radius:16px;cursor:pointer;
                            background:{a.primary ? T.primary : T.surface};
                            border:{a.primary ? 'none' : `1px solid ${T.hairline}`};
                            color:{a.primary ? '#fff' : T.ink};
                            display:flex;flex-direction:row;align-items:center;justify-content:center;gap:8px;
                            {a.primary ? 'box-shadow:0 4px 12px rgba(88,73,212,0.3);' : ''}
                            transition:transform 180ms ease-out, box-shadow 180ms ease-out, background 180ms ease-out;
                        "
                    >
                        <Icon name={a.icon} size={18} stroke={a.primary ? '#fff' : T.inkBody} strokeWidth={1.8} />
                        <span style="font-size:13px;font-weight:580;">{a.label}</span>
                    </button>
                {/each}
            </div>
        </div>

        <!-- ─── MINTABLE NUDGE ────────────────────────────────────────── -->
        {#if !mintableChecked}
            <!-- Reserve the nudge's footprint (72px card + 14px margin) while the mintable
                 check is pending, so a positive result fills this space rather than shoving
                 the activity list down. Non-human avatars set mintableChecked immediately, so
                 they never reserve. -->
            <div style="margin-top:14px;height:72px;" aria-hidden="true"></div>
        {:else if mintableAmount >= 0.01}
            <div style="
                margin-top:14px;padding:14px 16px;border-radius:18px;
                background:linear-gradient(160deg,{T.coralSoft} 0%,{T.lilacSoft} 100%);
                display:flex;align-items:center;gap:12px;
            ">
                <div style="width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <Icon name="sparkle" size={20} stroke={T.coral} strokeWidth={2} />
                </div>
                <div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;">
                    <span style="font-size:11px;font-weight:600;color:#8A3A1E;letter-spacing:0.04em;text-transform:uppercase;">Ready to mint</span>
                    <div style="display:flex;align-items:baseline;gap:6px;">
                        <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};line-height:1;letter-spacing:-0.015em;">{roundToDecimals(mintableAmount)}</span>
                        <span style="font-size:11px;color:{T.inkMuted};font-weight:500;">CRC growing</span>
                    </div>
                </div>
                <button
                    onclick={openMintPopup}
                    style="
                        height:44px;min-width:96px;padding:0 22px;border-radius:9999px;
                        background:{T.primary};color:#fff;border:0;cursor:pointer;
                        font-family:{T.fontSans};font-size:13px;font-weight:540;
                        white-space:nowrap;flex-shrink:0;
                        box-shadow:0 4px 12px rgba(88,73,212,0.25),0 1px 0 rgba(255,255,255,0.18) inset;
                    "
                >Mint</button>
            </div>
        {/if}

        <!-- ─── TRUST INSIGHTS ────────────────────────────────────────── -->
        <DashboardTrustCard />

        <!-- ─── MARKETPLACE SPENDING (renders only when there's spend) ─── -->
        <DashboardSpendingCard />

        <!-- ─── ACTIVITY HEADING ──────────────────────────────────────── -->
        <div style="margin-top:22px;margin-bottom:10px;padding:0 4px;">
            <span style="font-size:12px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Today</span>
        </div>

        <!-- ─── ACTIVITY LIST ─────────────────────────────────────────── -->
        <div
            data-transactions-list-scope
            style="
                background:{T.surface};border-radius:20px;border:1px solid {T.hairlineSoft};overflow:hidden;
                box-shadow:{T.shadow.xs};
                --transaction-row-height: {TRANSACTION_ROW_HEIGHT}px;
            "
        >
            <VirtualList
                row={TransactionRow}
                store={groupedTransactionHistory}
                rowHeight={TRANSACTION_ROW_HEIGHT}
                maxPlaceholderPages={2}
                expectedPageSize={25}
                eagerLoadMultiplier={2}
                placeholderRow={TransactionRowPlaceholder}
            />
        </div>

        <div style="height:24px;"></div>
    </div>
{/if}

</div>

<style>
    @media (min-width: 768px) {
        :global(.hero-card) { padding: 28px 32px 24px !important; }
    }
    @keyframes balance-skel-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    :global(.balance-skel) {
        animation: balance-skel-pulse 1.6s ease-in-out infinite;
    }
</style>
