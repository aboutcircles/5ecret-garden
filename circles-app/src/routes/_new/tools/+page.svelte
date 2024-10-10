<script lang="ts">
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {ethers, MaxUint256} from "ethers6";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import type {Avatar} from "@circles-sdk/sdk";
    import type {GroupProfile} from "@circles-sdk/profiles";
    import Profile from "../../settings/editors/Profile.svelte";

    let mintPolicyAddress: string = $circles?.circlesConfig.baseGroupMintPolicy ?? "";
    $: mintPolicyAddressIsValid = ethers.isAddress(mintPolicyAddress);

    let fromAddress: string = "";
    let toAddress: string = "";
    let result: any;

    async function calculatePath() {
        if (!$circles) {
            throw new Error('Wallet not connected ($circles is undefined)');
        }

        result = await $circles.v2Pathfinder?.getArgsForPath(fromAddress, toAddress, MaxUint256.toString())
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Calculate path</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="fromAddress" class="block text-sm font-medium text-gray-700">From</label>
                <input bind:value={fromAddress}
                       type="text" id="fromAddress"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="0x.....">
            </div>
            <div>
                <label for="toAddress" class="block text-sm font-medium text-gray-700">To</label>
                <input bind:value={toAddress}
                       type="text" id="toAddress"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="0x.....">
            </div>
            <ActionButton action={calculatePath}>
                Calculate path
            </ActionButton>
            <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
    </div>
</div>
