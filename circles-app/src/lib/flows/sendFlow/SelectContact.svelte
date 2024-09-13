<script lang="ts" context="module">
    export type SelectedEvent = {
        address: string;
        profile: Profile;
    };
</script>
<script lang="ts">
    import type {Profile} from "../../../../../../../temp/circles-sdk/packages/profiles/src";
    import {ethers} from "ethers6";
    import {createEventDispatcher} from "svelte";

    export let recentAddresses: { [address: string]: Profile } = {};

    export let selectedAddress: string | undefined = undefined;
    export let selectedProfile: Profile | undefined = undefined;

    let editorText: string | undefined = undefined;

    const eventDispatcher = createEventDispatcher();

    $: filteredAddresses = Object.keys(recentAddresses).filter((address) => {
        return address.toLowerCase().includes(editorText?.toLowerCase() ?? "") || selectedAddress || recentAddresses[address].name?.toLowerCase()?.includes(editorText?.toLowerCase() ?? "");
    });

    function selected(address: string, profile: Profile | undefined) {
        console.log("Selected address:", address, profile);
        eventDispatcher("select", <SelectedEvent>{
            address: address,
            profile: profile
        });
    }

    const handleInput = (e: any) => {
        editorText = (e.target as HTMLInputElement).value;
        if (ethers.isAddress(editorText)) {
            selectedAddress = editorText;
            selectedProfile = recentAddresses[editorText];
            selected(editorText, recentAddresses[editorText]);
        } else {
            selectedAddress = undefined;
            selectedProfile = undefined;
        }
    };
</script>

<h3 class="font-bold text-lg">Select Address</h3>

<div class="form-control my-4">
    <input
            type="text"
            class="input input-bordered"
            placeholder="Enter or search Ethereum address"
            bind:value={editorText}
            on:input={handleInput}
    />
</div>

<div class="mt-4">
    <h4 class="font-semibold mb-2">Recent Addresses</h4>
    <ul class="menu bg-base-100 rounded-box w-full">
        {#if Object.keys(filteredAddresses).length > 0}
            {#each filteredAddresses as address}
                <li on:click={() => {
                            selectedProfile = recentAddresses[address];
                            selectedAddress = address;
                            selected(address, recentAddresses[address]);
                        }}>
                    <p>{recentAddresses[address].name} {recentAddresses[address].name == address ? "" : " (" + address + ")"}</p>
                </li>
            {/each}
        {:else}
            <li>No recent addresses found</li>
        {/if}
    </ul>
</div>
