<script lang="ts">
    import { tokenTypeToString, TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type { Address } from '@circles-sdk/utils';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import ChangeButton from '$lib/areas/wallet/ui/components/ChangeButton.svelte';
    import AutoRouteSummary from '$lib/areas/wallet/ui/components/AutoRouteSummary.svelte';

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
        onselect,
    }: Props = $props();

    const isAutoRoute = $derived(asset?.tokenAddress === TransitiveTransferTokenAddress);
</script>

<div class="mt-4 flex flex-col gap-y-4">
    <RowFrame clickable={true} noLeading={true} onclick={onEditTo}>
        <div class="w-full flex items-center justify-between gap-3">
            <div class="min-w-0">
                <div class="menu-title p-0">To</div>
                <Avatar address={receiverAddress} clickable={true} view="horizontal" />
            </div>
            <ChangeButton />
        </div>
    </RowFrame>

    <RowFrame clickable={true} noLeading={true} onclick={onEditRoute}>
        <div class="w-full flex items-center justify-between gap-3">
            <div class="min-w-0">
                <div class="menu-title p-0">Route</div>
                {#if isAutoRoute}
                    <AutoRouteSummary />
                {:else}
                    <Avatar
                            address={asset?.tokenOwner}
                            clickable={true}
                            bottomInfo={tokenTypeToString(asset?.tokenType)}
                            view="horizontal"
                    />
                {/if}
            </div>
            <ChangeButton />
        </div>
    </RowFrame>

    <RowFrame clickable={true} noLeading={true} onclick={onEditAmount}>
        <div class="w-full flex items-center justify-between gap-3">
            <div class="min-w-0">
                <div class="menu-title p-0">Amount</div>
                <div class="text-2xl font-semibold">{roundToDecimals(amount)} Circles</div>
            </div>
            <ChangeButton />
        </div>
    </RowFrame>

    {#if data}
        <RowFrame clickable={false} noLeading={true}>
            <div>
                <div class="menu-title p-0">Note</div>
                {#if dataType === 'hex'}
                    <code class="break-all">{data}</code>
                {:else}
                    <span>{data}</span>
                {/if}
            </div>
        </RowFrame>
    {/if}

    <div class="mt-6 flex justify-end">
        <button type="submit" class="btn btn-primary btn-sm" onclick={() => onselect()}>
            {textButton}
        </button>
    </div>
</div>
