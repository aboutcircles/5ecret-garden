<script lang="ts">
    import {createEventDispatcher, onMount} from "svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import CurrencyInput from "$lib/components/CurrencyInput.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {TransitiveTransferTokenAddress} from "./SelectAsset.svelte";

    const eventDispatcher = createEventDispatcher();

    export let receiverAddress: string | undefined;
    export let asset: TokenBalanceRow | undefined;
    export let amount: number = 0;
    export let maxAmountCircles: number = -1;

    // onMount(async () => {
    //     if (!receiverAddress) {
    //         throw new Error("Receiver address is required");
    //     }
    //     if (!asset) {
    //         throw new Error("Asset is required");
    //     }
    //     if (!$avatar) {
    //         throw new Error("Avatar store is not available");
    //     }
    //
    //     try {
    //         if (asset.tokenAddress === TransitiveTransferTokenAddress) {
    //             maxAmountCircles = await $avatar.getMaxTransferableAmount(receiverAddress);
    //         } else {
    //             maxAmountCircles = await $avatar.getMaxTransferableAmount(receiverAddress, asset.tokenAddress);
    //         }
    //     } catch (e) {
    //         console.log("Failed to get max transferable amount", e);
    //         maxAmountCircles = -2;
    //     }
    // });
</script>

<div class="mb-4">
    <CurrencyInput balanceRow={asset} bind:amount maxAmountCircles={maxAmountCircles}></CurrencyInput>
</div>

<!-- Action Buttons -->
<div class="flex justify-end space-x-2 mt-6">
    <button type="submit" class="btn btn-primary max-sm:w-full rounded-md text-white mt-8 md:mt-2"
            on:click={() => eventDispatcher("select", {amount: amount})}>
        Continue
    </button>
</div>
