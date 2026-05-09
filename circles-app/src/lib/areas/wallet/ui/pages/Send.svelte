<script lang="ts">
    import { tokenTypeToString, TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { roundToDecimals, shortenAddress } from '$lib/shared/utils/shared';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type { Address } from '@circles-sdk/utils';
    import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';

    interface Props {
        receiverAddress: Address | undefined;
        asset: TokenBalanceRow;
        amount?: number;
        textButton: string;
        data: string | undefined;
        dataType: 'hex' | 'utf-8' | undefined;
        onEditTo: () => void;
        onEditRoute: () => void;
        onEditAmount: () => void;
        submitDisabled?: boolean;
        validationMessage?: string | null;
        onselect: () => void;
    }

    let {
        receiverAddress,
        asset,
        amount = 0,
        textButton,
        data,
        dataType,
        onEditTo,
        onEditRoute,
        onEditAmount,
        submitDisabled = false,
        validationMessage = null,
        onselect,
    }: Props = $props();

    const isAutoRoute = $derived(asset?.tokenAddress === TransitiveTransferTokenAddress);
    const senderAddress = $derived(avatarState.avatar?.address);

    const detailRows = $derived(() => {
        const rows: Array<{ k: string; v: string; pill?: string }> = [
            { k: 'Network', v: 'Gnosis Chain · L2' },
            { k: 'Route', v: isAutoRoute ? 'Auto route' : (tokenTypeToString(asset?.tokenType) ?? '—') },
            { k: 'Gas', v: 'Gas-free', pill: 'sponsored' },
        ];
        if (data) {
            rows.push({
                k: 'Memo',
                v: dataType === 'hex' ? data : data,
            });
        }
        return rows;
    });
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
    <!-- Big light "Sending" card -->
    <div style="
        position:relative;overflow:hidden;
        padding:24px 22px;border-radius:22px;
        background:radial-gradient(120% 140% at 100% 0%, {T.lilacSoft} 0%, {T.surface} 65%);
        border:1px solid {T.hairlineSoft};
        box-shadow:{T.shadow.sm};
    ">
        <!-- Sending header -->
        <button
            type="button"
            onclick={onEditAmount}
            style="
                display:flex;flex-direction:column;align-items:flex-start;gap:4px;
                background:transparent;border:0;padding:0;cursor:pointer;text-align:left;width:100%;
                position:relative;
            "
        >
            <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Sending</span>
            <div style="display:flex;align-items:baseline;gap:10px;">
                <span style="font-family:{T.fontDisplay};font-size:56px;color:{T.ink};letter-spacing:-0.025em;line-height:1;font-weight:400;font-variant-numeric:tabular-nums;">
                    {roundToDecimals(amount)}
                </span>
                <span style="font-size:16px;font-weight:500;color:{T.inkMuted};">CRC</span>
            </div>
        </button>

        <!-- Divider -->
        <div style="height:1px;background:{T.hairlineSoft};margin:18px 0;position:relative;"></div>

        <!-- Sender → receiver path -->
        <button
            type="button"
            onclick={onEditTo}
            style="
                display:flex;align-items:center;gap:14px;width:100%;
                background:transparent;border:0;padding:0;cursor:pointer;text-align:left;
                position:relative;
            "
        >
            <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;border:2px solid {T.surface};box-shadow:0 0 0 1px {T.hairline};overflow:hidden;background:{T.surface};">
                <Avatar address={senderAddress} view="small_no_text" clickable={false} />
            </div>

            <div style="flex:1;display:flex;align-items:center;justify-content:center;">
                <svg width="100%" height="20" viewBox="0 0 200 20" preserveAspectRatio="none" style="display:block;">
                    <line x1="0" y1="10" x2="200" y2="10" stroke="rgba(31,17,70,0.18)" stroke-width="2" stroke-dasharray="3 4" />
                    {#if isAutoRoute}
                        <circle cx="60" cy="10" r="3.5" fill={T.coral} />
                        <circle cx="140" cy="10" r="3.5" fill={T.lilac} />
                    {/if}
                </svg>
            </div>

            <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;border:2px solid {T.surface};box-shadow:0 0 0 1px {T.hairline};overflow:hidden;background:{T.surface};">
                <Avatar address={receiverAddress} view="small_no_text" clickable={false} />
            </div>
        </button>

        <!-- Captions under avatars -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 2px;">
            <span style="font-size:11px;color:{T.inkMuted};">you</span>
            <span style="font-size:11px;color:{T.inkMuted};">
                {isAutoRoute ? 'via trust path' : 'direct'}
            </span>
            <span style="font-size:11px;color:{T.inkMuted};font-family:{T.fontMono};">
                {receiverAddress ? shortenAddress(receiverAddress) : '—'}
            </span>
        </div>
    </div>

    <!-- Detail rows -->
    <div style="
        background:{T.surfaceAlt};border-radius:14px;border:1px solid {T.hairlineSoft};
        overflow:hidden;
    ">
        {#each detailRows() as row, i}
            {@const isLast = i === detailRows().length - 1}
            {@const clickable = row.k === 'Route'}
            <button
                type="button"
                onclick={clickable ? onEditRoute : undefined}
                disabled={!clickable}
                style="
                    display:flex;align-items:center;justify-content:space-between;width:100%;
                    padding:12px 14px;
                    background:transparent;border:0;
                    border-bottom:{isLast ? 'none' : `1px solid ${T.hairlineSoft}`};
                    cursor:{clickable ? 'pointer' : 'default'};text-align:left;
                "
            >
                <span style="font-size:12.5px;color:{T.inkMuted};">{row.k}</span>
                <span style="display:inline-flex;align-items:center;gap:6px;max-width:60%;">
                    <span style="font-size:12.5px;color:{T.ink};font-weight:540;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        {row.v}
                    </span>
                    {#if row.pill}
                        <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:9999px;background:{T.sageSoft};color:#1F5E37;font-size:10px;font-weight:580;letter-spacing:0.02em;">{row.pill}</span>
                    {/if}
                    {#if clickable}
                        <Icon name="chevronRight" size={12} stroke={T.inkFaint} />
                    {/if}
                </span>
            </button>
        {/each}
    </div>

    {#if validationMessage}
        <StepAlert variant="warning" message={validationMessage} />
    {/if}

    <!-- Submit -->
    <button
        type="submit"
        disabled={submitDisabled}
        onclick={() => onselect()}
        data-send-step-initial-focus
        data-popup-default-action
        style="
            width:100%;height:52px;border-radius:9999px;border:0;cursor:pointer;
            background:{submitDisabled ? T.pageDeep : T.primary};
            color:{submitDisabled ? T.inkMuted : '#fff'};
            display:inline-flex;align-items:center;justify-content:center;gap:8px;
            font-family:{T.fontSans};font-size:15px;font-weight:580;letter-spacing:-0.005em;
            box-shadow:{submitDisabled ? 'none' : '0 6px 18px rgba(88,73,212,0.32),0 1px 0 rgba(255,255,255,0.18) inset'};
            opacity:{submitDisabled ? 0.85 : 1};
            transition:transform .08s,box-shadow .15s;
        "
    >
        <Icon name="send" size={16} stroke={submitDisabled ? T.inkMuted : '#fff'} strokeWidth={2} />
        {textButton}
    </button>

    <span style="font-size:11px;color:{T.inkSubtle};text-align:center;margin-top:-4px;">
        Final review · won't be undoable
    </span>
</div>
