<script lang="ts">
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {ethers} from "ethers6";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import type {Avatar} from "@circles-sdk/sdk";
    import type {GroupProfile} from "@circles-sdk/profiles";
    import Profile from "../../settings/editors/Profile.svelte";

    let mintPolicyAddress: string = "0xdcCDfdB91067807898477876e5670CC7Edd68a78";
    $: mintPolicyAddressIsValid = ethers.isAddress(mintPolicyAddress);

    let profile: GroupProfile = {
        name: "",
        description: "",
        previewImageUrl: "",
        imageUrl: undefined,
        symbol: "",
    };

    async function registerGroup() {
        if (!$circles) {
            throw new Error('Wallet not connected ($circles is undefined)');
        }

        // TODO: Implement profiles
        $avatar = <Avatar>await $circles.registerGroupV2(
            mintPolicyAddress,
            profile
        );

        await goto("/dashboard");
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Register as group</h2>
        <Profile bind:profile={profile}/>
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
                <label for="symbol" class="block text-sm font-medium text-gray-700">Symbol</label>
                <input bind:value={profile.symbol}
                       type="text" id="symbol"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="GRP">
            </div>
            <ActionButton action={registerGroup}
                          disabled={!mintPolicyAddressIsValid || profile.name.trim().length < 1 || profile.symbol.trim().length < 1}>
                Create
            </ActionButton>
        </div>
    </div>
</div>
