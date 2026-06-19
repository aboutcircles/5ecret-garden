<script lang="ts">
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import Icon from '$lib/design-system/Icon.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import type { BreakdownLeg } from '$lib/shared/utils/txBreakdown';

    interface Props {
        legs: BreakdownLeg[];
        title?: string;
        /** Optional pre-folded minor legs; normally the summary leg carries them in `children`. */
        minorLegs?: BreakdownLeg[];
        /** Optional signed net of the folded legs (unused when the summary leg carries its own). */
        minorNet?: number;
    }
    let { legs, title = 'What happened' }: Props = $props();

    // Each collapsed summary leg (kind === 'group') toggles independently. Keyed by leg.key.
    let openGroups = $state<Set<string>>(new Set());
    function isGroupOpen(key: string): boolean {
        return openGroups.has(key);
    }
    function toggleGroup(key: string) {
        const next = new Set(openGroups);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        openGroups = next;
    }

    // Count of all rendered rows (individual legs + folded children) for the section header.
    const totalRowCount = $derived(
        legs.reduce((acc, l) => acc + (l.kind === 'group' ? (l.children?.length ?? 0) : 1), 0)
    );

    function formatAmount(v: number): string {
        const abs = Math.abs(v);
        if (Object.is(abs, 0)) {
            return '0';
        }
        if (abs < 0.01) {
            return '< 0.01';
        }
        return abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function signColor(sign: BreakdownLeg['sign']): string {
        if (sign === 'plus') {
            return T.positive;
        }
        if (sign === 'minus') {
            return T.negative;
        }
        return T.ink;
    }

    function signPrefix(sign: BreakdownLeg['sign']): string {
        if (sign === 'plus') {
            return '+';
        }
        if (sign === 'minus') {
            return '−';
        }
        return '';
    }
</script>

{#snippet legRow(leg: BreakdownLeg, withTopBorder: boolean)}
    <div style="padding:10px 14px;{withTopBorder ? `border-top:1px solid ${T.hairlineSoft};` : ''}display:flex;align-items:center;gap:10px;">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
            <span style="font-size:13px;font-weight:580;color:{T.inkBody};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                {leg.label}
            </span>
            {#if leg.counterparty}
                <div style="display:flex;align-items:center;min-width:0;">
                    <Avatar address={leg.counterparty} view="small" clickable={true} />
                </div>
            {/if}
        </div>
        <span style="flex-shrink:0;min-width:88px;text-align:right;font-size:13px;font-weight:580;color:{signColor(leg.sign)};font-variant-numeric:tabular-nums;white-space:nowrap;">
            {signPrefix(leg.sign)}{formatAmount(leg.amount)}<span style="color:{T.inkMuted};font-weight:540;margin-left:3px;">CRC</span>
        </span>
        <div style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;color:{T.inkMuted};width:26px;justify-content:flex-end;">
            {#if leg.tokenAddress}
                <Avatar address={leg.tokenAddress} view="small_no_text" clickable={true} />
            {:else}
                <div style="width:22px;height:22px;border-radius:9999px;background:{T.pageDeep};display:inline-flex;align-items:center;justify-content:center;">
                    <Icon name="sparkle" size={11} stroke={T.inkMuted} />
                </div>
            {/if}
        </div>
    </div>
{/snippet}

{#if legs.length}
    <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};">
            <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                {title} <span style="color:{T.inkFaint};">({totalRowCount})</span>
            </span>
        </div>
        {#each legs as leg, li (leg.key)}
            {#if leg.kind === 'group'}
                <!-- Collapsed flow-matrix tail: expandable summary row (same pattern as Burns). -->
                <button
                    type="button"
                    style="width:100%;padding:10px 14px;{li > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}background:{T.surfaceAlt};border-left:0;border-right:0;border-bottom:0;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;color:{T.inkMuted};"
                    onclick={() => toggleGroup(leg.key)}
                    aria-expanded={isGroupOpen(leg.key)}
                    title={isGroupOpen(leg.key) ? 'Hide transfers' : 'Show transfers'}
                >
                    <span style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;display:inline-flex;align-items:center;gap:6px;">
                        <span style="display:inline-flex;transition:transform 0.15s;transform:rotate({isGroupOpen(leg.key) ? 90 : 0}deg);">
                            <Icon name="arrowRight" size={11} stroke={T.inkMuted} />
                        </span>
                        {leg.label}
                    </span>
                    <span style="flex-shrink:0;min-width:88px;text-align:right;font-size:13px;font-weight:580;color:{signColor(leg.sign)};font-variant-numeric:tabular-nums;white-space:nowrap;">
                        {leg.sign === 'neutral' ? '' : signPrefix(leg.sign)}{formatAmount(leg.amount)}<span style="color:{T.inkMuted};font-weight:540;margin-left:3px;">CRC</span>
                    </span>
                </button>
                {#if isGroupOpen(leg.key)}
                    {#each leg.children ?? [] as child (child.key)}
                        {@render legRow(child, true)}
                    {/each}
                {/if}
            {:else}
                {@render legRow(leg, li > 0)}
            {/if}
        {/each}
    </div>
{/if}
