<script lang="ts" context="module">
    export type SelectedEvent = {
        address: string;
        profile: Profile;
    };
</script>
<script lang="ts">
    import type {Profile} from "../../../../../../temp/circles-sdk/packages/profiles/src";
    import {ethers} from "ethers6";
    import {createEventDispatcher, onMount} from "svelte";
    import Avatar from "$lib/components/Avatar.svelte";
    import type {ContactList} from "$lib/stores/contacts";
    import {shortenAddress} from "$lib/utils/shared";

    export let recentAddresses: ContactList = {};

    export let selectedAddress: string | undefined = undefined;
    export let selectedProfile: Profile | undefined = undefined;

    let editorText: string | undefined = undefined;
    let inputElement: HTMLInputElement | undefined = undefined;

    const eventDispatcher = createEventDispatcher();

    onMount(() => {
        console.log(`SelectContact.svelte: Selected address: ${selectedAddress}`);
        if (selectedAddress && inputElement) {
            editorText = selectedAddress;
            inputElement.value = editorText;
            filteredAddresses = Object.keys(recentAddresses).filter((address) => {
                return address.toLowerCase().includes(editorText?.toLowerCase() ?? "")
                    || address == selectedAddress
                    || recentAddresses[address].contactProfile.name?.toLowerCase()?.includes(editorText?.toLowerCase() ?? "");
            });
        } else {
            filteredAddresses = Object.keys(recentAddresses);
        }
    });

    let filteredAddresses = Object.keys(recentAddresses) ?? [];

    function selected(address: string, profile: Profile | undefined) {
        eventDispatcher("select", <SelectedEvent>{
            address: address,
            profile: profile
        });
    }

    const handleInput = (e: any) => {
        editorText = (e.target as HTMLInputElement).value;

        filteredAddresses = Object.keys(recentAddresses).filter((address) => {
            return address.toLowerCase().includes(editorText?.toLowerCase() ?? "")
                || address == selectedAddress
                || recentAddresses[address].contactProfile.name?.toLowerCase()?.includes(editorText?.toLowerCase() ?? "");
        })

        if (ethers.isAddress(editorText)) {
            selectedAddress = editorText;
            selectedProfile = recentAddresses[editorText].contactProfile;
            selected(editorText, recentAddresses[editorText].contactProfile);
        } else {
            selectedAddress = undefined;
            selectedProfile = undefined;
        }
    };
</script>

<div class="form-control my-4">
    <input
            type="text"
            class="input input-bordered"
            placeholder="Enter or search Ethereum address"
            on:input={handleInput}
            on:paste={handleInput}
            on:cut={handleInput}
            bind:this={inputElement}
    />
</div>

<div class="mt-4">
    <p class="menu-title pl-0">
        Recent Addresses
    </p>
    {#if Object.keys(filteredAddresses).length > 0}
        {#each filteredAddresses as address(address)}
            <div class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg" on:click={() => {
                            selectedProfile = recentAddresses[address].contactProfile;
                            selectedAddress = address;
                            selected(address, recentAddresses[address].contactProfile);
                        }}>
                <div class="col">
                    <Avatar address={address} clickable={false}>
                        {shortenAddress(address)}
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
