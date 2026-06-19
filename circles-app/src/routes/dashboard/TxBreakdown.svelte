<script lang="ts">
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import Icon from '$lib/design-system/Icon.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import type { BreakdownLeg } from '$lib/shared/utils/txBreakdown';

    interface Props {
        legs: BreakdownLeg[];
        title?: string;
    }
    let { legs, title = 'What happened' }: Props = $props();

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

{#if legs.length}
    <div style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};">
            <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
                {title} <span style="color:{T.inkFaint};">({legs.length})</span>
            </span>
        </div>
        {#each legs as leg, li (leg.key)}
            <div style="padding:10px 14px;{li > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}display:flex;align-items:center;gap:10px;">
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
        {/each}
    </div>
{/if}
