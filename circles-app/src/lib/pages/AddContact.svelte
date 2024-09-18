<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import type {Profile} from "@circles-sdk/profiles";
    import {ethers} from "ethers6";

    export let selectedAddress: string | undefined = undefined;
    export let selectedProfile: Profile | undefined = undefined;

    let editorText: string | undefined = undefined;

    const filteredAddresses: string[] = [];
    const profiles: Record<string, Profile> = {};

    const handleInput = (e: any) => {
        editorText = (e.target as HTMLInputElement).value;
        if (ethers.isAddress(editorText)) {
            selectedAddress = editorText;
        } else {
        }
    };

    function selected(address: string, profile: Profile | undefined) {
        console.log("Selected", address, profile);
    }
</script>

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
    <p class="menu-title pl-0">
        Found avatars
    </p>
    {#if filteredAddresses.length > 0}
        {#each filteredAddresses as address(address)}
            <div class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg" on:click={() => {
                            selectedProfile = profiles[address];
                            selectedAddress = address;
                            selected(address, profiles[address]);
                        }}>
                <div class="col">
                    <Avatar address={address} clickable={false}>
                        {address}
                    </Avatar>
                </div>
            </div>
        {/each}
    {:else}
        <div class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg">No recent addresses
            found
        </div>
    {/if}
</div>
