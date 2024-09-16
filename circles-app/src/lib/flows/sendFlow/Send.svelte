<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {tokenTypeToString} from "$lib/flows/sendFlow/SelectAsset.svelte";
    import {createEventDispatcher} from "svelte";
    import {floorToDecimals, shortenAddress} from "$lib/utils/shared";

    export let tokenAddress: string | undefined;
    export let tokenOwner: string | undefined;
    export let tokenType: string | undefined;
    export let circlesBalance: number = 0;
    export let receiverAddress: string | undefined;
    export let amount: number = 0;
    export let maxValue: number = Number.MAX_VALUE;

    const eventDispatcher = createEventDispatcher();
</script>

<!-- Header -->
<h3 class="text-xl font-semibold mb-4">
    <button class="btn inline p-2" on:click={() => {
        eventDispatcher("back");
    }}>
        &lt; Back
    </button>
    Send Circles
</h3>

<!-- Receiver Information -->
<div class="form-control mb-4">
    <p class="menu-title pl-0">
        Asset:
    </p>

    <div class="flex items-center justify-between p-2 rounded-lg">
        <div class="col">
            <Avatar address={tokenOwner} clickable={false}>
                <span>
                    {tokenTypeToString(tokenType)}
                </span>
                {#if tokenAddress !== "0x0000000000000000000000000000000000000000"}
                    <a class="block underline" target="_blank"  href={"https://gnosisscan.io/address/" + tokenAddress}>{shortenAddress(tokenAddress)}</a>
                {/if}
            </Avatar>
        </div>

        <div class="col text-right">
            <span class="text-lg">{floorToDecimals(circlesBalance)}</span> Circles
        </div>
    </div>
</div>
<p class="menu-title pl-0">
    To:
</p>
<div class="flex items-center justify-between p-2 rounded-lg">
    <Avatar address={receiverAddress} clickable={false}>
        <a class="block underline" target="_blank" href={"https://gnosisscan.io/address/" + receiverAddress}>{shortenAddress(receiverAddress)}</a>
    </Avatar>
</div>

<!-- Amount Input -->
<div class="form-control mb-4">
    <label class="label">
        <span class="label-text font-medium text-gray-600">Enter amount to send</span>
    </label>
    <input type="number" step="0.01" min="0" max={maxValue} placeholder="0.00"
           class="input input-bordered w-full text-lg p-2"
           bind:value={amount}>
</div>

<!-- Action Buttons -->
<div class="flex justify-end space-x-2 mt-6">
    <button type="submit" class="btn btn-primary px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600"
            on:click={() => eventDispatcher("send", {amount: amount})}>
        Send
    </button>
</div>
