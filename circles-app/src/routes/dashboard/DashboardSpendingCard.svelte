<script lang="ts">
    import { goto } from '$app/navigation';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import {
        gatewaySpending,
        summarizeSpendWindows,
        type SpendWindow,
    } from '$lib/shared/state/gatewaySpending.svelte';
    import { T } from '$lib/design-system/tokens.js';

    // Time-horizon spend totals derived from the shared gateway-spending store. Recomputed
    // whenever the payment list changes; cheap (a few sums over a bounded list).
    const windows = $derived(summarizeSpendWindows($gatewaySpending.payments));

    // Store load-completion signals — never infer "no spend" from an empty list mid-load
    // (same lesson as the contacts/trust store).
    const loaded = $derived($gatewaySpending.loaded);
    const errored = $derived($gatewaySpending.error);
    const totalCount = $derived(windows.all.count);

    // The card is OPTIONAL: most avatars never use the marketplace, so render nothing until
    // loaded and only when there's genuine spend (or a load error worth surfacing). This
    // avoids cluttering non-marketplace dashboards with a permanent empty state. Gate on
    // spend MAGNITUDE (not count) so a sub-0.01 purchase can't show "1 purchase / 0 all
    // time" — roundToDecimals floors, so a <0.01 total would render as a confusing "0".
    const show = $derived(loaded && (errored || windows.all.total >= 0.01));

    type HorizonRow = { id: SpendWindow; label: string };
    const HORIZONS: HorizonRow[] = [
        { id: '7d', label: 'last 7d' },
        { id: '30d', label: 'last 30d' },
        { id: 'all', label: 'all time' },
    ];

    // Only show a horizon that actually carries spend, so an all-in-30-days history doesn't
    // print "0.00 last 7d". `all` always shows when there's any spend (it's the total).
    const visibleHorizons = $derived(
        HORIZONS.filter((h) => h.id === 'all' || windows[h.id].total >= 0.01)
    );
</script>

{#if show}
    <button
        onclick={() => goto('/insights')}
        aria-label="View your marketplace spending"
        style="
            width:100%;margin-top:14px;padding:14px 16px;border-radius:18px;
            background:{T.surface};border:1px solid {T.hairlineSoft};
            box-shadow:{T.shadow.xs};cursor:pointer;text-align:left;display:block;
            font-family:{T.fontSans};
        "
    >
        <!-- Header row -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Marketplace spending</span>
            {#if !errored && totalCount > 0}
                <span style="
                    font-size:10.5px;font-weight:580;color:#8A3A1E;
                    background:{T.coralSoft};border-radius:9999px;padding:2px 8px;
                    white-space:nowrap;
                ">{totalCount} {totalCount === 1 ? 'purchase' : 'purchases'}</span>
            {/if}
        </div>

        {#if errored}
            <div style="margin-top:8px;font-size:13px;color:{T.inkMuted};">Couldn’t load spending</div>
        {:else}
            <!-- Horizon totals — each on one row (number · label), matching the trust card. -->
            <div style="display:flex;align-items:center;gap:16px;margin-top:10px;flex-wrap:wrap;">
                {#each visibleHorizons as h}
                    <div style="display:flex;align-items:baseline;gap:6px;min-width:0;">
                        <span style="font-family:{T.fontDisplay};font-size:18px;color:{T.ink};line-height:1;letter-spacing:-0.015em;font-weight:400;">{roundToDecimals(windows[h.id].total)}</span>
                        <span style="font-size:12px;color:{T.inkMuted};white-space:nowrap;">{h.label}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </button>
{/if}
