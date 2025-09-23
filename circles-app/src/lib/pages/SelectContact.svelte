<script lang="ts" module>
    import type { Profile } from '@circles-sdk/profiles';
    import type { Address } from '@circles-sdk/utils';

    export type SelectedEvent = {
        address: Address;
        profile: Profile;
    };
</script>

<script lang="ts">
    import type { ContactList } from '$lib/stores/contacts';
    import type { Readable } from 'svelte/store';
    import AddressInput from '$lib/components/AddressInput.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { shortenAddress } from '$lib/utils/shared';
    import RowFrame from '$lib/ui/RowFrame.svelte';

    interface Props {
        store?:
            | Readable<{ data: ContactList; next: () => Promise<boolean>; ended: boolean; }>
            | undefined;
        selectedAddress?: Address;
        addressListTitle?: string;
        noResultsMessage?: string;
        group?: boolean;
        onselect?: (address: Address) => void;
    }

    let {
        store = undefined,
        selectedAddress = $bindable(''),
        addressListTitle = 'Recent',
        noResultsMessage = 'No recent addresses found',
        group = false,
        onselect
    }: Props = $props();

    let data = $derived($store?.data ?? {});
    let filteredAddresses = $derived((() => {
        if (selectedAddress) {
            return Object.keys(data).filter(
                (address) =>
                    address.toLowerCase().includes(selectedAddress.toLowerCase()) ||
                    data[address]?.contactProfile?.name
                        ?.toLowerCase()
                        ?.includes(selectedAddress.toLowerCase())
            );
        } else {
            return Object.keys(data);
        }
    })());

    function handleSelect(address: Address) {
        const profile = $store?.data[address]?.contactProfile;
        onselect?.(address);
    }
</script>

<div class="form-control my-4 relative w-full">
    <AddressInput bind:address={selectedAddress} />
</div>

{#if selectedAddress && !group}
    <p class="menu-title p-0">Selected Address:</p>

    <RowFrame clickable={true} dense={true} noLeading={true} on:click={() => handleSelect(selectedAddress)}>
        <div class="min-w-0">
            <Avatar
                    address={selectedAddress}
                    clickable={false}
                    view="horizontal"
                    bottomInfo={shortenAddress(selectedAddress)}
            />
        </div>
        <div slot="trailing" aria-hidden="true">
            <img src="/chevron-right.svg" alt="" class="icon" />
        </div>
    </RowFrame>
{:else}
    <p class="menu-title pl-0">{addressListTitle}</p>

    {#if filteredAddresses.length > 0}
        <div class="w-full flex flex-col gap-y-1.5 overflow-x-auto">
            {#each filteredAddresses as address (address)}
                <RowFrame clickable={true} dense={true} noLeading={true} on:click={() => handleSelect(address)}>
                    <div class="min-w-0">
                        <Avatar {address} view="horizontal" clickable={false} bottomInfo={shortenAddress(address)} />
                    </div>
                    <div slot="trailing" aria-hidden="true">
                        <img src="/chevron-right.svg" alt="" class="icon" />
                    </div>
                </RowFrame>
            {/each}
        </div>
    {:else}
        {@html noResultsMessage}
    {/if}
{/if}
