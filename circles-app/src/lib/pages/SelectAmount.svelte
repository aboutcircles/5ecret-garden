<script lang="ts">
    import {createEventDispatcher, onMount} from "svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import CurrencyInput from "$lib/components/CurrencyInput.svelte";

    const eventDispatcher = createEventDispatcher();

    export let asset: TokenBalanceRow;
    export let amount: number = 0;
    export let maxAmountCircles: number = -1;

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
