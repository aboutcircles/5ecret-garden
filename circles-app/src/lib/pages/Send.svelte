<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {tokenTypeToString} from "$lib/pages/SelectAsset.svelte";
    import {createEventDispatcher} from "svelte";
    import {floorToDecimals, shortenAddress} from "$lib/utils/shared";
    import type {TokenBalanceRow} from "@circles-sdk/data";

    export let receiverAddress: string | undefined;
    export let asset: TokenBalanceRow | undefined;
    export let amount: number = 0;

    const eventDispatcher = createEventDispatcher();
</script>

<!-- Receiver Information -->
<div class="form-control mb-4">
    <p class="menu-title pl-0">
        Asset:
    </p>

    <div class="flex items-center justify-between p-2 rounded-lg">
        <div class="col">
            <Avatar address={asset?.tokenOwner} clickable={false}>
                <span>
                    {tokenTypeToString(asset?.tokenType)}
                </span>
                {#if asset?.tokenAddress !== "0x0000000000000000000000000000000000000000"}
                    <a class="block underline" target="_blank"
                       href={"https://gnosisscan.io/address/" + asset?.tokenAddress}>{shortenAddress(asset?.tokenAddress)}</a>
                {/if}
            </Avatar>
        </div>

        <div class="col text-right">
            <span class="text-lg">{floorToDecimals(asset?.circles)}</span> Circles
        </div>
    </div>
</div>
<p class="menu-title pl-0">
    To:
</p>
<div class="flex items-center justify-between p-2 rounded-lg">
    <Avatar address={receiverAddress} clickable={false}>
        <a class="block underline" target="_blank"
           href={"https://gnosisscan.io/address/" + receiverAddress}>{shortenAddress(receiverAddress)}</a>
    </Avatar>
</div>

<!-- Amount Input -->
<div class="form-control mb-4">
    <p class="menu-title pl-0">
        Amount:
    </p>
    <span class="input w-full text-lg p-2">
        {amount} Circles
    </span>
</div>

<!-- Action Buttons -->
<div class="flex justify-end space-x-2 mt-6">
    <button type="submit" class="btn btn-primary px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600"
            on:click={() => eventDispatcher("select", {amount: amount})}>
        Send
    </button>
</div>
