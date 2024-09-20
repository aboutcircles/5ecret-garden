<script lang="ts" context="module">
    export type SelectedEvent = {
        address: string;
        profile: Profile;
    };
</script>
<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";
    import {ethers} from "ethers6";
    import {createEventDispatcher} from "svelte";
    import Avatar from "$lib/components/Avatar.svelte";
    import type {ContactList} from "$lib/stores/contacts";
    import {shortenAddress} from "$lib/utils/shared";
    import type {Readable} from "svelte/store";

    export let store: Readable<{
        data: ContactList,
        next: () => Promise<boolean>,
        ended: boolean
    }> | undefined = undefined;

    export let selectedAddress: string | undefined = undefined;
    export let selectedProfile: Profile | undefined = undefined;
    export let addressListTitle: string = "Recent Addresses";

    let editorText: string | undefined = undefined;
    let inputElement: HTMLInputElement | undefined = undefined;

    const eventDispatcher = createEventDispatcher();

    $: data = $store?.data;
    $: filteredAddresses = filter(data ?? {});

    function filter(contactList: ContactList) {
        let filteredAddresses: string[] = [];

        if (selectedAddress && inputElement) {
            editorText = selectedAddress;
            inputElement.value = editorText;

            filteredAddresses = Object.keys(contactList).filter((address) => {
                return address.toLowerCase().includes(editorText?.toLowerCase() ?? "")
                    || address == selectedAddress
                    || contactList[address].contactProfile.name?.toLowerCase()?.includes(editorText?.toLowerCase() ?? "");
            });
        } else {
            filteredAddresses = Object.keys(contactList);
        }

        return filteredAddresses;
    }

    function selected(address: string, profile: Profile | undefined) {
        eventDispatcher("select", <SelectedEvent>{
            address: address,
            profile: profile
        });
    }

    const handleInput = (e: any) => {
        editorText = (e.target as HTMLInputElement).value;

        if (!data) {
            throw new Error("No data available");
        }

        filteredAddresses = Object.keys(data).filter((address) => {
            return address.toLowerCase().includes(editorText?.toLowerCase() ?? "")
                || address == selectedAddress
                || $store?.data[address].contactProfile.name?.toLowerCase()?.includes(editorText?.toLowerCase() ?? "");
        })

        if (ethers.isAddress(editorText)) {
            selectedAddress = editorText;
            selectedProfile = $store?.data[editorText]?.contactProfile;
            selected(editorText, $store?.data[editorText]?.contactProfile);
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
        {addressListTitle}
    </p>
    {#if Object.keys(filteredAddresses).length > 0}
        {#each filteredAddresses as address(address)}
            <div class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg" on:click={() => {
                            selectedProfile = $store?.data[address].contactProfile;
                            selectedAddress = address;
                            selected(address, $store?.data[address].contactProfile);
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
