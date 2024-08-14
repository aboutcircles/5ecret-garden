<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {page} from "$app/stores";
    import {ethers} from "ethers6";
    import {avatar} from "$lib/stores/avatar";
    import {crcToTc, tcToCrc} from "@circles-sdk/utils";
    import {goto} from "$app/navigation";
    import AssetPicker from "$lib/components/AssetPicker.svelte";
    import {onMount} from "svelte";
    import {circles} from "$lib/stores/circles";
    import type {TokenBalanceRow} from "@circles-sdk/data";

    let recipient: string = $page.params.to ?? "";
    let valueString: string = "";

    let balances: TokenBalanceRow[] = [];
    let selectedCollateral: string | undefined;

    $: recipientIsValid = ethers.isAddress(recipient);

    $: maxTransferableAmount = recipientIsValid
        ? $avatar?.getMaxTransferableAmount(recipient, selectedCollateral)
        : Promise.resolve(BigInt(0));

    onMount(async () => {
        if ($avatar?.address && $circles) {
            balances = await $circles.data.getTokenBalancesV2($avatar?.address);
        }
        selectedCollateral = balances.find(b => b.tokenOwner === $avatar?.address)?.tokenOwner;
    });

    $: console.log(`Selected collateral: ${selectedCollateral}`);

    async function send() {
        const sendValue = $avatar?.avatarInfo?.version === 1
            ? tcToCrc(new Date(), parseFloat(valueString))
            : ethers.parseEther(valueString.toString());

        await $avatar?.transfer(recipient, sendValue, selectedCollateral);
        await goto("/dashboard");
    }

    function formatAmount(amount: bigint) {
        if ($avatar?.avatarInfo?.version === 1) {
            return crcToTc(new Date(), amount ?? BigInt(0)).toFixed(2);
        } else {
            return ethers.formatEther(amount ?? BigInt(0));
        }
    }

    async function setMax() {
        if (!maxTransferableAmount) {
            valueString = "0";
            return;
        }
        valueString = formatAmount(await maxTransferableAmount);
    }
</script>

<div class="relative">
    <label for="recipient" class="block text-sm font-medium text-gray-700">Recipient Address</label>
    <div class="flex">
        <input class="mt-1 block w-full p-2 border border-gray-300 rounded-l-md"
               bind:value={recipient}
               type="text"
               id="recipient"
               placeholder="0x123...">
    </div>
</div>

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
        <button id="set-max" class="bg-blue-500 text-white p-2 rounded-r-md flex items-center justify-center"
                on:click={() => setMax()}>
            Set Max
        </button>
    </div>
</div>

<!-- Max Amount Display -->
<div class="flex items-center justify-between mt-2">
    <p class="text-sm text-gray-500">Max Amount: <span id="max-amount">
            {#await maxTransferableAmount}
                <span>Loading ...</span>
            {:then maxAmount}
                {#if maxAmount}
                    {formatAmount(maxAmount)}
                {:else}
                    0
                {/if}
            {/await}
        </span></p>
</div>

<!-- Send Button -->
<div class="mt-4">
    <ActionButton action={send} disabled={!recipientIsValid}>
        Send
    </ActionButton>
</div>
