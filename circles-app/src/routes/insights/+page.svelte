<script lang="ts">
    import { goto } from '$app/navigation';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { roundToDecimals, getTimeAgo } from '$lib/shared/utils/shared';
    import { T } from '$lib/design-system/tokens.js';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import {
        computeFlowMetrics,
        emptyFlowMetrics,
        type FlowWindow,
        type FlowMetrics,
        type FlowBucket,
        type FlowTx,
    } from '$lib/shared/utils/flowMetrics';
    import { gatewaySpending } from '$lib/shared/state/gatewaySpending.svelte';

    // --- window selection ---------------------------------------------------------------
    // Default to 30d — the widest fully-covered window (the flow engine bounds at 30d/600
    // legs, so "all" is annotated as capped rather than truly lifetime).
    let activeWindow: FlowWindow = $state('30d');

    const WINDOWS: { id: FlowWindow; label: string }[] = [
        { id: 'today', label: 'Today' },
        { id: '7d', label: '7d' },
        { id: '30d', label: '30d' },
        { id: 'all', label: 'All' },
    ];

    const DAY_SECONDS = 86_400;
    function windowStartSeconds(window: FlowWindow): number {
        const now = Math.floor(Date.now() / 1000);
        switch (window) {
            case 'today': {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                return Math.floor(start.getTime() / 1000);
            }
            case '7d':
                return now - 7 * DAY_SECONDS;
            case '30d':
                return now - 30 * DAY_SECONDS;
            case 'all':
            default:
                return 0;
        }
    }

    // Take the window as a typed param so the comparisons stay against `FlowWindow` rather
    // than the `$state` initializer's narrowed literal (which would make `=== 'today'` etc.
    // a "no overlap" type error).
    function labelFor(window: FlowWindow): string {
        return window === 'today' ? 'today' : window === 'all' ? 'all time' : `last ${window}`;
    }
    const windowLabel = $derived(labelFor(activeWindow));

    // --- flow metrics -------------------------------------------------------------------
    let metricsByWindow: Record<FlowWindow, FlowMetrics> | null = $state(null);
    let loading = $state(true);
    let errored = $state(false);

    $effect(() => {
        const address = avatarState.avatar?.address;
        if (!address) {
            metricsByWindow = null;
            loading = false;
            errored = false;
            return;
        }
        let cancelled = false;
        loading = true;
        errored = false;
        metricsByWindow = null;
        (async () => {
            try {
                const result = await computeFlowMetrics(address);
                if (cancelled) return;
                metricsByWindow = result;
            } catch (e) {
                if (cancelled) return;
                console.warn('[insights] failed to compute flow metrics', e);
                errored = true;
            } finally {
                if (!cancelled) loading = false;
            }
        })();
        return () => {
            cancelled = true;
        };
    });

    const metrics: FlowMetrics = $derived(
        metricsByWindow ? metricsByWindow[activeWindow] : emptyFlowMetrics()
    );

    // --- bucket display -----------------------------------------------------------------
    type BucketRow = { id: FlowBucket; label: string; sign: '+' | '−' | ''; color: string };
    const BUCKETS: BucketRow[] = [
        { id: 'minted', label: 'Minted', sign: '+', color: T.sage },
        { id: 'received', label: 'Received', sign: '+', color: T.sage },
        { id: 'sent', label: 'Sent', sign: '−', color: T.coral },
        { id: 'spent', label: 'Spent', sign: '−', color: T.coral },
        { id: 'demurrage', label: 'Demurrage', sign: '−', color: T.inkMuted },
        { id: 'converted', label: 'Converted', sign: '', color: T.inkMuted },
    ];
    const visibleBuckets = $derived(BUCKETS.filter((b) => Math.abs(metrics[b.id]) >= 0.01));
    const net = $derived(metrics.net);

    // Expandable bucket → its contributing legs. One open at a time keeps the page tidy.
    let expanded: FlowBucket | null = $state(null);
    function toggle(b: FlowBucket) {
        expanded = expanded === b ? null : b;
    }

    // Per-bucket lists are bounded to keep the DOM light; surface the dropped count rather
    // than silently truncating.
    const ROW_CAP = 50;
    function legsFor(b: FlowBucket): FlowTx[] {
        const all = metrics.txByBucket[b] ?? [];
        return [...all].sort((x, y) => y.timestamp - x.timestamp);
    }

    // --- minting (Phase D) --------------------------------------------------------------
    // Derived from the minted bucket of the SELECTED window. Personal CRC accrues
    // continuously and is claimed on-demand, so "days active" (distinct UTC days with a
    // mint) is the honest engagement signal; a current streak is shown only when ≥2.
    const mintStats = $derived.by(() => {
        const legs = metrics.txByBucket.minted ?? [];
        const days = new Set<string>();
        for (const l of legs) {
            const d = new Date(l.timestamp * 1000);
            days.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
        }
        // Current streak: walk back from today over consecutive UTC days present in `days`.
        let streak = 0;
        const cursor = new Date();
        cursor.setUTCHours(0, 0, 0, 0);
        // Allow the streak to start at today OR yesterday (a not-yet-claimed today shouldn't
        // zero an otherwise live streak).
        const key = (dt: Date) => `${dt.getUTCFullYear()}-${dt.getUTCMonth()}-${dt.getUTCDate()}`;
        if (!days.has(key(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
        while (days.has(key(cursor))) {
            streak++;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        }
        return { total: metrics.minted, count: legs.length, daysActive: days.size, streak };
    });

    // --- marketplace spending (Phase C detail) ------------------------------------------
    const spendPayments = $derived.by(() => {
        const start = windowStartSeconds(activeWindow);
        return $gatewaySpending.payments
            .filter((p) => p.timestamp >= start)
            .sort((a, b) => b.timestamp - a.timestamp);
    });
    const spendTotal = $derived(
        spendPayments.reduce((acc, p) => acc + Number(p.amount) / 1e18, 0)
    );
</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
    <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button
                    onclick={() => goto('/dashboard')}
                    aria-label="Back to wallet"
                    class="btn-naked"
                    style="background:transparent;border:0;padding:4px;cursor:pointer;color:{T.inkMuted};display:inline-flex;"
                >‹ Back</button>
                <h1 style="font-family:{T.fontDisplay};font-size:24px;color:{T.ink};letter-spacing:-0.01em;font-weight:500;margin:0;">Insights</h1>
            </div>
            <div role="tablist" aria-label="Time window" style="display:inline-flex;gap:2px;padding:3px;border-radius:9999px;flex-shrink:0;background:{T.surface};border:1px solid {T.hairlineSoft};">
                {#each WINDOWS as w}
                    <button
                        role="tab"
                        aria-selected={activeWindow === w.id}
                        onclick={() => (activeWindow = w.id)}
                        style="padding:5px 12px;border:0;cursor:pointer;border-radius:9999px;font-size:12px;font-weight:560;line-height:1;background:{activeWindow === w.id ? T.primary : 'transparent'};color:{activeWindow === w.id ? '#fff' : T.inkMuted};transition:background 140ms ease-out,color 140ms ease-out;"
                    >{w.label}</button>
                {/each}
            </div>
        </div>

        {#if !avatarState.avatar}
            <div style="margin-top:40px;text-align:center;color:{T.inkMuted};font-size:14px;">
                Connect your wallet to see insights.
            </div>
        {:else if loading}
            <div style="margin-top:24px;display:flex;flex-direction:column;gap:12px;">
                {#each [0, 1, 2] as _}
                    <div class="ins-skel" style="height:64px;border-radius:18px;"></div>
                {/each}
            </div>
        {:else if errored}
            <div style="margin-top:40px;text-align:center;color:{T.inkMuted};font-size:14px;">Couldn’t load insights. Try again later.</div>
        {:else}
            <!-- ─── FLOW ──────────────────────────────────────────────── -->
            <section style="margin-top:14px;padding:18px 18px 8px;border-radius:20px;background:{T.surface};border:1px solid {T.hairlineSoft};box-shadow:{T.shadow.xs};">
                <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Flow {windowLabel}</span>
                    <div style="display:flex;align-items:baseline;gap:6px;">
                        <span style="font-family:{T.fontSans};font-size:18px;font-weight:640;line-height:1;font-variant-numeric:tabular-nums;color:{net >= 0 ? T.sage : T.coral};">{net >= 0 ? '+' : '−'}{roundToDecimals(Math.abs(net))}</span>
                        <span style="font-size:11px;color:{T.inkMuted};font-weight:500;">net{metrics.capped && activeWindow === 'all' ? ' (30d+)' : ''}</span>
                    </div>
                </div>

                {#if visibleBuckets.length === 0}
                    <div style="margin:14px 0 10px;font-size:13px;color:{T.inkMuted};">No activity {windowLabel}.</div>
                {:else}
                    <div style="margin-top:12px;display:flex;flex-direction:column;">
                        {#each visibleBuckets as b (b.id)}
                            {@const legs = legsFor(b.id)}
                            <button
                                onclick={() => toggle(b.id)}
                                aria-expanded={expanded === b.id}
                                style="display:flex;align-items:center;gap:10px;width:100%;padding:11px 4px;background:transparent;border:0;border-bottom:1px solid {T.hairlineSoft};cursor:pointer;text-align:left;font-family:{T.fontSans};"
                            >
                                <span style="width:7px;height:7px;border-radius:4px;background:{b.color};flex-shrink:0;"></span>
                                <span style="flex:1;font-size:14px;color:{T.ink};font-weight:540;">{b.label}</span>
                                <span style="font-size:11px;color:{T.inkMuted};">{legs.length}×</span>
                                <span style="font-family:{T.fontMono};font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;color:{b.color};">{b.sign}{roundToDecimals(Math.abs(metrics[b.id]))}</span>
                                <span style="color:{T.inkFaint};font-size:13px;width:14px;text-align:center;">{expanded === b.id ? '▾' : '▸'}</span>
                            </button>
                            {#if expanded === b.id}
                                <div style="padding:4px 4px 12px;display:flex;flex-direction:column;gap:2px;">
                                    {#each legs.slice(0, ROW_CAP) as leg (leg.hash + leg.counterparty + leg.timestamp)}
                                        <div style="display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:10px;background:{T.surfaceAlt ?? T.page};">
                                            <div style="flex:1;min-width:0;">
                                                {#if b.id === 'minted'}
                                                    <span style="font-size:13px;color:{T.ink};">Personal mint</span>
                                                {:else if b.id === 'demurrage'}
                                                    <span style="font-size:13px;color:{T.ink};">Demurrage</span>
                                                {:else}
                                                    <Avatar address={leg.counterparty} view="small" clickable={false} />
                                                {/if}
                                                <div style="font-size:11px;color:{T.inkMuted};margin-top:1px;">{getTimeAgo(leg.timestamp)}</div>
                                            </div>
                                            <span style="font-family:{T.fontMono};font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:{b.color};">{b.sign}{roundToDecimals(leg.amount)}</span>
                                        </div>
                                    {/each}
                                    {#if legs.length > ROW_CAP}
                                        <div style="font-size:11px;color:{T.inkMuted};padding:6px 8px;">+{legs.length - ROW_CAP} more not shown</div>
                                    {/if}
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </section>

            <!-- ─── MINTING (Phase D) ─────────────────────────────────── -->
            {#if mintStats.count > 0}
                <section style="margin-top:14px;padding:18px;border-radius:20px;background:{T.surface};border:1px solid {T.hairlineSoft};box-shadow:{T.shadow.xs};">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Minting {windowLabel}</span>
                        {#if mintStats.streak >= 2}
                            <span style="font-size:10.5px;font-weight:580;color:{T.primaryDeep};background:{T.primarySoft};border-radius:9999px;padding:2px 8px;">🔥 {mintStats.streak}-day streak</span>
                        {/if}
                    </div>
                    <div style="display:flex;align-items:center;gap:18px;margin-top:12px;flex-wrap:wrap;">
                        <div style="display:flex;align-items:baseline;gap:6px;">
                            <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};line-height:1;letter-spacing:-0.015em;">+{roundToDecimals(mintStats.total)}</span>
                            <span style="font-size:12px;color:{T.inkMuted};">CRC minted</span>
                        </div>
                        <div style="display:flex;align-items:baseline;gap:6px;">
                            <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};line-height:1;">{mintStats.daysActive}</span>
                            <span style="font-size:12px;color:{T.inkMuted};">days active</span>
                        </div>
                        <div style="display:flex;align-items:baseline;gap:6px;">
                            <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};line-height:1;">{mintStats.count}</span>
                            <span style="font-size:12px;color:{T.inkMuted};">{mintStats.count === 1 ? 'mint' : 'mints'}</span>
                        </div>
                    </div>
                </section>
            {/if}

            <!-- ─── MARKETPLACE SPENDING (Phase C detail) ─────────────── -->
            {#if $gatewaySpending.error}
                <section style="margin-top:14px;padding:18px;border-radius:20px;background:{T.surface};border:1px solid {T.hairlineSoft};box-shadow:{T.shadow.xs};">
                    <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Marketplace spending</span>
                    <div style="margin-top:8px;font-size:13px;color:{T.inkMuted};">Couldn’t load marketplace spending</div>
                </section>
            {:else if spendPayments.length > 0}
                <section style="margin-top:14px;padding:18px;border-radius:20px;background:{T.surface};border:1px solid {T.hairlineSoft};box-shadow:{T.shadow.xs};">
                    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                        <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Marketplace spending {windowLabel}</span>
                        <div style="display:flex;align-items:baseline;gap:6px;">
                            <span style="font-family:{T.fontSans};font-size:16px;font-weight:640;font-variant-numeric:tabular-nums;color:{T.coral};">−{roundToDecimals(spendTotal)}</span>
                            <span style="font-size:11px;color:{T.inkMuted};">{spendPayments.length} {spendPayments.length === 1 ? 'purchase' : 'purchases'}</span>
                        </div>
                    </div>
                    <div style="margin-top:10px;display:flex;flex-direction:column;gap:2px;">
                        {#each spendPayments.slice(0, ROW_CAP) as p (p.tx + p.timestamp)}
                            <div style="display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:10px;background:{T.surfaceAlt ?? T.page};">
                                <div style="flex:1;min-width:0;">
                                    <Avatar address={p.payee.toLowerCase()} view="small" clickable={false} />
                                    <div style="font-size:11px;color:{T.inkMuted};margin-top:1px;">
                                        {getTimeAgo(p.timestamp)}{p.dataDecoded && p.dataDecoded.length > 0 && p.dataDecoded.length < 60 ? ` · ${p.dataDecoded}` : ''}
                                    </div>
                                </div>
                                <span style="font-family:{T.fontMono};font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:{T.coral};">−{roundToDecimals(Number(p.amount) / 1e18)}</span>
                            </div>
                        {/each}
                        {#if spendPayments.length > ROW_CAP}
                            <div style="font-size:11px;color:{T.inkMuted};padding:6px 8px;">+{spendPayments.length - ROW_CAP} more not shown</div>
                        {/if}
                    </div>
                </section>
            {/if}
        {/if}

        <div style="height:24px;"></div>
    </div>
</div>

<style>
    .ins-skel {
        background: rgba(15, 10, 30, 0.06);
        animation: ins-skel-pulse 1.6s ease-in-out infinite;
    }
    @keyframes ins-skel-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
</style>
