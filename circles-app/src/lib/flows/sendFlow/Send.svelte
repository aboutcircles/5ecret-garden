<script lang="ts">
    import type {Profile} from "../../../../../../../temp/circles-sdk/packages/profiles/src";
    import {avatar} from "$lib/stores/avatar";
    import {ethers} from "ethers6";

    export let tokenAddress: string | undefined;
    export let receiverAddress: string | undefined;
    export let receiverProfile: Profile | undefined;
    export let amount: number = 0;
    export let maxValue: number = Number.MAX_VALUE;

    async function send() {
        if (!$avatar) {
            return;
        }
        if (!ethers.isAddress(receiverAddress)) {
            throw new Error(`Invalid receiver address: ${receiverAddress}`);
        }
        if (!ethers.isAddress(tokenAddress)) {
            throw new Error(`Invalid token address: ${tokenAddress}`);
        }

        if (tokenAddress) {
            await $avatar.transfer(receiverAddress!, amount, tokenAddress);
        } else {
            await $avatar.transfer(receiverAddress!, amount);
        }
    }
</script>

<!-- Header -->
<h3 class="text-xl font-semibold mb-4">Send Circles</h3>

<!-- Receiver Information -->
<div class="form-control mb-4">
    <label class="label">
        <span class="label-text font-medium text-gray-600">To</span>
    </label>
    {#if receiverProfile}
        <p class="font-bold text-gray-800">{receiverProfile.name}</p>
        <p class="text-sm text-gray-500">{receiverAddress}</p>
    {:else}
        <p class="font-medium text-gray-800">{receiverAddress}</p>
    {/if}
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
    <button type="button" class="btn btn-outline px-6 py-2 rounded-md text-gray-600" onclick="wrapModal.close()">
        Cancel
    </button>
    <button type="submit" class="btn btn-primary px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600"
            on:click={send}>
        Send
    </button>
</div>
