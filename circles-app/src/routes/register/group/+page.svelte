<script lang="ts">
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {ethers} from "ethers";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import type {Avatar} from "@circles-sdk/sdk";

    let mintPolicyAddress: string = "0xdcCDfdB91067807898477876e5670CC7Edd68a78";
    $: mintPolicyAddressIsValid = ethers.isAddress(mintPolicyAddress);

    let name: string = "";
    let symbol: string = "";
    let cidV0: string = "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB";

    async function registerGroup() {
        if (!$circles) {
            throw new Error('Wallet not connected ($circles is undefined)');
        }

        $avatar = <Avatar>await $circles.registerGroupV2(
            mintPolicyAddress,
            name,
            symbol,
            cidV0
        );

        await goto("/dashboard");
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Register as group</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="mintPolicyAddress" class="block text-sm font-medium text-gray-700">Mint policy
                    address</label>
                <input bind:value={mintPolicyAddress}
                       type="text" id="mintPolicyAddress"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="0x.....">
            </div>
            <div>
                <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                <input bind:value={name}
                       type="text" id="name"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="My group">
            </div>
            <div>
                <label for="symbol" class="block text-sm font-medium text-gray-700">Symbol</label>
                <input bind:value={symbol}
                       type="text" id="symbol"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="GRP">
            </div>
            <div>
                <label for="cidV0" class="block text-sm font-medium text-gray-700">CidV0</label>
                <input bind:value={cidV0}
                       type="text" id="cidV0"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="Qm..">
            </div>
            <ActionButton action={registerGroup}
                          disabled={!mintPolicyAddressIsValid || !name || name.length < 1 || !symbol}>
                Create
            </ActionButton>
        </div>
    </div>
</div>
