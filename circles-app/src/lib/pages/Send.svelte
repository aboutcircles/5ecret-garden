<script lang="ts">
    import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
    import { roundToDecimals } from '$lib/utils/shared';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import type { Address } from '@circles-sdk/utils';
    import RowFrame from '$lib/ui/RowFrame.svelte';

    interface Props {
        receiverAddress: Address | undefined;
        asset: TokenBalanceRow;
        amount?: number;
        textButton: string;
        data: string | undefined;
        dataType: 'hex' | 'utf-8' | undefined;
        onselect: () => void;
    }

    let {
        receiverAddress,
        asset,
        amount = 0,
        textButton,
        data,
        dataType,
        onselect,
    }: Props = $props();
</script>

<!-- Receiver Information -->
<div class="mt-4 flex flex-col gap-y-4">
    <p class="menu-title p-0">Asset:</p>

    <RowFrame clickable={false} noLeading={true}>
        <div class="w-full flex items-center justify-between">
            <div class="min-w-0">
                <Avatar
                        address={asset?.tokenOwner}
                        clickable={false}
                        bottomInfo={tokenTypeToString(asset?.tokenType)}
                        view="horizontal"
                />
            </div>
            <div class="text-right shrink-0">
                <span class="text-2xl">{roundToDecimals(amount)}</span> Circles
            </div>
        </div>
    </RowFrame>

    <p class="menu-title mt-8 md:mt-4 p-0">To:</p>

    <RowFrame clickable={false} noLeading={true}>
        <div class="min-w-0">
            <Avatar address={receiverAddress} clickable={false} view="horizontal" />
        </div>
    </RowFrame>

    {#if data}
        <p class="menu-title mt-8 md:mt-4 p-0">Data:</p>
        <RowFrame clickable={false} noLeading={true}>
            {#if dataType === 'hex'}
                <code class="break-all">{data}</code>
            {:else}
                <span>{data}</span>
            {/if}
        </RowFrame>
    {/if}

    <div class="flex justify-end space-x-2 mt-6">
        <button type="submit" class="btn btn-primary text-white max-sm:w-full" onclick={() => onselect()}>
            {textButton}
        </button>
    </div>
</div>
