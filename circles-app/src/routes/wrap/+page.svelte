<script lang="ts">
    import {ethers} from "ethers6";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import AssetPicker from "$lib/components/AssetPicker.svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import {onMount} from "svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";

    let valueString: string = "";
    let selectedCollateral: string | undefined;
    let circlesBalances: TokenBalanceRow[] = [];

    onMount(async () => {
        if ($avatar?.address && $circles) {
            balances = await $circles.data.getTokenBalances($avatar?.address);
        }
        selectedCollateral = balances.find(b => b.tokenOwner === $avatar?.address)?.tokenOwner;
    });

    async function wrapInflationary() {
        if ($avatar?.avatarInfo?.version !== 2) {
            throw new Error("Only supported for Avatar v2");
        }
        if (!selectedCollateral) {
            return;
        }
        const sendValue = ethers.parseEther(valueString.toString());
        const receipt = await $avatar?.wrapInflationErc20(selectedCollateral, sendValue);
    }

    async function wrapDemurraged() {
        if ($avatar?.avatarInfo?.version !== 2) {
            throw new Error("Only supported for Avatar v2");
        }
        if (!selectedCollateral) {
            return;
        }
        const sendValue = ethers.parseEther(valueString.toString());
        const receipt = await $avatar?.wrapDemurrageErc20(selectedCollateral, sendValue);
    }
</script>

<div class="mt-4">
    <label for="asset" class="block text-sm font-medium text-gray-700">Asset</label>
    <div id="asset">
        <AssetPicker {balances} bind:selectedCollateral/>
    </div>
</div>

<div class="mt-4">
    <label for="amount" class="block text-sm font-medium text-gray-700">Amount</label>
    <div class="flex">
        <input bind:value={valueString} type="number" id="amount"
               class="mt-1 block w-full p-2 border border-gray-300 rounded-l-md"
               placeholder="0.00">
    </div>
</div>

<!-- Send Button -->
<div class="mt-4">
    <ActionButton action={wrapInflationary} disabled={!selectedCollateral}>
        Wrap as inflation ERC20
    </ActionButton>
    <ActionButton action={wrapDemurraged} disabled={!selectedCollateral}>
        Wrap as demurrage ERC20
    </ActionButton>
</div>

<!-- balance of wrapped tokens I hold -->
<div class="mt-4">
    <h2 class="text-lg">Wrapped token circlesBalances</h2>
</div>
