<script lang="ts">
    import { goto } from '$app/navigation';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import { T } from '$lib/design-system/tokens.js';
    import {
        computeFlowMetrics,
        emptyFlowMetrics,
        type FlowWindow,
        type FlowMetrics,
        type FlowBucket,
    } from '$lib/shared/utils/flowMetrics';

    // Selected time horizon. Default to "today" to match the prior pill semantics.
    // Named `activeWindow` (not `window`) to avoid shadowing the global `window` object.
    let activeWindow: FlowWindow = $state('today');

    // Per-window metrics keyed by window; computed once per avatar.
    let metricsByWindow: Record<FlowWindow, FlowMetrics> | null = $state(null);
    let loading: boolean = $state(true);
    let errored: boolean = $state(false);

    const WINDOWS: { id: FlowWindow; label: string }[] = [
        { id: 'today', label: 'Today' },
        { id: '7d', label: '7d' },
        { id: '30d', label: '30d' },
        { id: 'all', label: 'All' },
    ];

    // Fetch + classify whenever the active avatar changes. Cancel stale writes when the
    // avatar changes mid-flight so an old result can never overwrite a newer one.
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
                console.warn('[DashboardFlowStrip] failed to compute flow metrics', e);
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

    // Bucket display config. `affectsNet` flags the value-changing buckets so the strip
    // can mirror the engine's guarantee that net == sum of the value buckets.
    type BucketRow = {
        id: FlowBucket;
        label: string;
        sign: '+' | '−' | '';
        color: string;
        affectsNet: boolean;
    };

    const BUCKETS: BucketRow[] = [
        { id: 'minted', label: 'minted', sign: '+', color: T.sage, affectsNet: true },
        { id: 'received', label: 'received', sign: '+', color: T.sage, affectsNet: true },
        { id: 'sent', label: 'sent', sign: '−', color: T.coral, affectsNet: true },
        { id: 'spent', label: 'spent', sign: '−', color: T.coral, affectsNet: true },
        { id: 'demurrage', label: 'demurrage', sign: '−', color: T.inkMuted, affectsNet: true },
        { id: 'converted', label: 'converted', sign: '', color: T.inkMuted, affectsNet: false },
    ];

    // Only show buckets carrying a non-dust amount in the active window.
    const visibleBuckets = $derived(
        BUCKETS.filter((b) => Math.abs(metrics[b.id]) >= 0.01)
    );

    const net: number = $derived(metrics.net);
    const hasActivity = $derived(visibleBuckets.length > 0);

    const windowLabel = $derived(
        activeWindow === 'today' ? 'today' : activeWindow === 'all' ? 'all time' : `last ${activeWindow}`
    );
</script>

<div class="flow-strip" style="display:flex;flex-direction:column;gap:8px;">
    <!-- Header: "Total balance" eyebrow (left) + window switcher (right). Wraps on very
         narrow screens so the switcher drops below the eyebrow instead of overflowing. -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap;">
        <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">
            Total balance
        </span>
        <div
            role="tablist"
            aria-label="Flow time window"
            style="
                display:inline-flex;gap:2px;padding:3px;border-radius:9999px;flex-shrink:0;
                background:{T.surface};border:1px solid {T.hairlineSoft};
            "
        >
            {#each WINDOWS as w}
                <button
                    role="tab"
                    aria-selected={activeWindow === w.id}
                    onclick={() => (activeWindow = w.id)}
                    style="
                        padding:5px 12px;border:0;cursor:pointer;border-radius:9999px;
                        font-family:{T.fontSans};font-size:12px;font-weight:560;line-height:1;
                        background:{activeWindow === w.id ? T.primary : 'transparent'};
                        color:{activeWindow === w.id ? '#fff' : T.inkMuted};
                        transition:background 140ms ease-out,color 140ms ease-out;
                    "
                >{w.label}</button>
            {/each}
        </div>
    </div>

    {#if loading}
        <!-- Skeleton -->
        <div style="display:flex;flex-direction:column;gap:6px;">
            <span class="flow-skel" style="display:inline-block;width:120px;height:18px;background:rgba(15,10,30,0.07);border-radius:7px;"></span>
            <span class="flow-skel" style="display:inline-block;width:200px;height:12px;background:rgba(15,10,30,0.05);border-radius:6px;"></span>
        </div>
    {:else if errored}
        <span style="font-size:12px;color:{T.inkMuted};">Couldn’t load activity</span>
    {:else if !hasActivity}
        <span style="font-size:12px;color:{T.inkMuted};">No activity {windowLabel}</span>
    {:else}
        <!-- NET headline for the window -->
        <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">
            <span
                style="
                    font-family:{T.fontSans};font-size:15px;font-weight:640;line-height:1;
                    font-variant-numeric:tabular-nums;
                    color:{net >= 0 ? T.sage : T.coral};
                "
            >{net >= 0 ? '+' : '−'}{roundToDecimals(Math.abs(net))}</span>
            <span style="font-size:11px;color:{T.inkMuted};font-weight:500;">net {windowLabel}</span>
            {#if metrics.capped}
                <span
                    title="History is capped at the most recent activity; older transactions are not included."
                    style="font-size:10px;color:{T.inkSubtle};font-weight:500;"
                >30d+</span>
            {/if}
        </div>

        <!-- Bucket breakdown -->
        <div style="display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;">
            {#each visibleBuckets as b (b.id)}
                <div
                    class="flow-bucket"
                    data-bucket={b.id}
                    style="display:inline-flex;align-items:baseline;gap:4px;"
                >
                    <span
                        style="
                            font-size:12px;font-weight:600;line-height:1;
                            font-variant-numeric:tabular-nums;color:{b.color};
                        "
                    >{b.sign}{roundToDecimals(Math.abs(metrics[b.id]))}</span>
                    <span style="font-size:11px;color:{T.inkMuted};font-weight:500;">{b.label}</span>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Drill-down entry: the /insights page expands exactly this net + buckets into
         per-leg detail (plus minting + marketplace spend). Always shown once loaded so the
         page is reachable even when there's no marketplace spend (the spending card hides). -->
    {#if !loading && !errored}
        <button
            onclick={() => goto('/insights')}
            class="flow-insights-link"
            style="
                align-self:flex-start;margin-top:2px;padding:2px 0;background:transparent;border:0;
                cursor:pointer;font-family:{T.fontSans};font-size:12px;font-weight:560;
                color:{T.primaryDeep};display:inline-flex;align-items:center;gap:3px;
            "
        >Insights ›</button>
    {/if}
</div>

<style>
    @keyframes flow-skel-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    :global(.flow-strip .flow-skel) {
        animation: flow-skel-pulse 1.6s ease-in-out infinite;
    }
</style>
