<script lang="ts">
    import Avatar from '$lib/components/Avatar.svelte';
    import {ensureContacts} from '../../+layout.svelte';
    import {onMount} from 'svelte';
    import type {Readable} from 'svelte/store';
    import type {ContactList} from '$lib/stores/contacts';
    import ProfilePage from '$lib/pages/Profile.svelte';
    import {popupControls} from '$lib/components/PopUp.svelte';
    import type {TrustRelationRow} from "@circles-sdk/data";

    let contacts:
        | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
    }>
        | undefined = undefined;

    let filterVersion: number | undefined = undefined;

    onMount(async () => {
        contacts = await ensureContacts();
        console.log($contacts);
    });

    function formatTrustRelation(row: TrustRelationRow) {
        switch (row.relation) {
            case 'trusts':
                return 'You accept their tokens';
            case 'trustedBy':
                return 'They accept your tokens';
            case 'mutuallyTrusts':
                return 'You accept each other’s tokens';
            case 'selfTrusts':
                return 'Self-trusted';
            case 'variesByVersion':
                return 'Trust relationship varies by version';
            default:
                return row.relation;
        }
    }

    $: filteredContacts = Object.keys($contacts?.data ?? {})
        .filter(address => {
            const contact = $contacts?.data[address];
            return (
                !filterVersion || // Show all if no filter is applied
                contact?.avatarInfo?.version === filterVersion
            );
        });

    $: orderedContacts = filteredContacts.sort((a, b) => {
        const aRelation = $contacts?.data[a].row.relation;
        const bRelation = $contacts?.data[b].row.relation;
        if (aRelation === 'mutuallyTrusts' && bRelation !== 'mutuallyTrusts') {
            return -1;
        }
        if (aRelation === 'trusts' && bRelation === 'trustedBy') {
            return -1;
        }
        if (aRelation === bRelation) {
            return 0;
        }
        if (bRelation === 'mutuallyTrusts' && aRelation !== 'mutuallyTrusts') {
            return 1;
        }
        if (bRelation === 'trusts' && aRelation === 'trustedBy') {
            return 1;
        }
        return 0;
    });
</script>

<div class="flex flex-col w-full sm:w-[90%] lg:w-3/5 p-0 gap-y-5 mt-28 mb-10 text-[#161616]">
    <div class="text-2xl font-bold leading-7 px-4 sm:px-0">Contacts</div>

    <!-- Filter -->
    <div class="flex flex-row gap-x-2">
        <button
                class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer ${
                filterVersion === undefined ? 'text-black' : 'text-gray-400'}`}
                on:click={() => (filterVersion = undefined)}
        >
            All
        </button>
        <button
                class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer ${
                filterVersion === 1 ? 'text-black' : 'text-gray-400'
            }`}
                on:click={() => (filterVersion = 1)}
        >
            Version 1
        </button>
        <button
                class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer ${
                filterVersion === 2 ? 'text-black' : 'text-gray-400'
            }`}
                on:click={() => (filterVersion = 2)}
        >
            Version 2
        </button>
    </div>

    <div class="flex flex-col p-0 px-4 sm:py-4 w-full sm:border sm:rounded-lg overflow-x-auto divide-y">
        {#each orderedContacts as address}
            <div class="-mx-4">
                <button
                        class="flex w-full items-center justify-between p-4 bg-base-100 hover:bg-base-200"
                        on:click={(e) => {
                        $popupControls.open?.({
                            component: ProfilePage,
                            title: '',
                            props: {
                                address: address,
                            },
                        });
                        e.preventDefault();
                        return true;
                    }}
                >
                    <Avatar {address}>
                        <div>
                            {#if $contacts?.data[address]}
                                <span class="text-[#6B7280]">{formatTrustRelation($contacts.data[address].row)}</span>
                            {/if}
                        </div>
                    </Avatar>
                    <div class="font-medium underline flex gap-x-2">
                        <img
                                src="/chevron-right.svg"
                                alt="Chevron Right"
                                class="w-4"
                        />
                    </div>
                </button>
            </div>
        {/each}
    </div>
</div>
