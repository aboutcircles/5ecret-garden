<script lang="ts">
    import {createEventDispatcher, onMount} from "svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import CurrencyInput from "$lib/components/CurrencyInput.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {TransitiveTransferTokenAddress} from "./SelectAsset.svelte";
    import {attoCirclesToCircles} from "@circles-sdk/data";

    const eventDispatcher = createEventDispatcher();

    export let receiverAddress: string | undefined;
    export let asset: TokenBalanceRow | undefined;
    export let amount: number = 0;
    let maxAmountCircles: number = 0;

    onMount(async () => {
        if (!receiverAddress) {
            throw new Error("Receiver address is required");
        }
        if (!asset) {
            throw new Error("Asset is required");
        }
        if (!$avatar) {
            throw new Error("Avatar store is not available");
        }

        let maxAmountAttoCircles: bigint;
        if (asset.tokenAddress === TransitiveTransferTokenAddress) {
            maxAmountAttoCircles = await $avatar.getMaxTransferableAmount(receiverAddress);
        } else {
            maxAmountAttoCircles = await $avatar.getMaxTransferableAmount(receiverAddress, asset.tokenAddress);
        }

        maxAmountCircles = attoCirclesToCircles(maxAmountAttoCircles);
    });
</script>

<div class="mb-4">
    <CurrencyInput balanceRow={asset} bind:amount></CurrencyInput>
</div>

<!-- Action Buttons -->
<div class="flex justify-end space-x-2 mt-6">
    <button type="submit" class="btn btn-primary px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600"
            on:click={() => eventDispatcher("select", {amount: amount})}>
        Send
    </button>
</div>
