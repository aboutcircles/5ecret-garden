<script lang="ts">
    import {ethers} from "ethers6";
    import {avatar} from "$lib/stores/avatar";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import BalanceRow from "$lib/components/BalanceRow.svelte";

    export let asset: TokenBalanceRow;

    let wrapType: 'Static' | 'Demurraged' = 'Static';
    let amount: number = 0;

    async function wrap() {
        const sendValue = ethers.parseEther(amount.toString());
        if (wrapType == 'Demurraged') {
            await wrapDemurraged(sendValue);
        } else {
            await wrapInflationary(sendValue);
        }
    }

    async function wrapInflationary(sendValue: bigint) {
        if ($avatar?.avatarInfo?.version !== 2) {
            throw new Error("Only supported for Avatar v2");
        }
        const receipt = await $avatar?.wrapInflationErc20(asset.tokenAddress, sendValue);
    }

    async function wrapDemurraged(sendValue: bigint) {
        if ($avatar?.avatarInfo?.version !== 2) {
            throw new Error("Only supported for Avatar v2");
        }
        const receipt = await $avatar?.wrapDemurrageErc20(asset.tokenAddress, sendValue);
    }
</script>

<!-- Form for entering the amount and selecting the wrapping type -->

<div class="p-6 pt-0">
    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Token
        </p>
        <BalanceRow balance={asset}/>
    </div>

    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Amount
        </p>
        <input type="number" step="0.01" min="0" max={asset.circles} placeholder="0.00"
               class="input input-bordered w-full" bind:value={amount}>
    </div>

    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Type
        </p>
        <div class="flex space-x-4">
            <label class="cursor-pointer flex items-center">
                <input type="radio" name="wrapType" value="Static" bind:group={wrapType}
                       class="radio radio-primary"/>
                <span class="ml-2">Static</span>
            </label>
            <label class="cursor-pointer flex items-center">
                <input type="radio" name="wrapType" value="Demurraged" bind:group={wrapType}
                       class="radio radio-primary"/>
                <span class="ml-2">Demurraged</span>
            </label>
        </div>
    </div>

    <div class="modal-action">
        <button type="submit" class="btn btn-primary" on:click={wrap}>Wrap</button>
    </div>
</div>