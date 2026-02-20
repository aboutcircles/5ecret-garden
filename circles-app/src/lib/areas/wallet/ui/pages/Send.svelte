<script lang="ts">
    import { tokenTypeToString, TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type { Address } from '@circles-sdk/utils';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import ChangeButton from '$lib/areas/wallet/ui/components/ChangeButton.svelte';
    import AutoRouteSummary from '$lib/areas/wallet/ui/components/AutoRouteSummary.svelte';
    import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';

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
</script>

<div class="mt-4 flex flex-col gap-y-4">
    <button type="button" class="w-full text-left bg-transparent border-0 p-0" onclick={onEditTo}>
        <RowFrame clickable={true} noLeading={true}>
            <div class="w-full flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="menu-title p-0">To</div>
                    <Avatar address={receiverAddress} clickable={true} view="horizontal" />
                </div>
                <ChangeButton />
            </div>
        </RowFrame>
    </button>

    <button type="button" class="w-full text-left bg-transparent border-0 p-0" onclick={onEditRoute}>
        <RowFrame clickable={true} noLeading={true}>
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
    </button>

    <button type="button" class="w-full text-left bg-transparent border-0 p-0" onclick={onEditAmount}>
        <RowFrame clickable={true} noLeading={true}>
            <div class="w-full flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="menu-title p-0">Amount</div>
                    <div class="text-2xl font-semibold">{roundToDecimals(amount)} Circles</div>
                </div>
                <ChangeButton />
            </div>
        </RowFrame>
    </button>

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

    {#if validationMessage}
        <StepAlert variant="warning" message={validationMessage} />
    {/if}

    <div class="mt-2 flex justify-end">
        <button
            type="submit"
            class="btn btn-primary btn-sm"
            data-send-step-initial-focus
            disabled={submitDisabled}
            onclick={() => onselect()}
        >
            {textButton}
        </button>
    </div>
</div>
