<script lang="ts">
    import Avatar from '$lib/components/Avatar.svelte';
    import {ensureContacts} from '../../+layout.svelte';
    import {onMount} from 'svelte';
    import type {Readable} from 'svelte/store';
    import type {ContactList, ExtendedTrustRelationRow} from '$lib/stores/contacts';
    import ProfilePage from '$lib/pages/Profile.svelte';
    import {popupControls} from '$lib/components/PopUp.svelte';

    let contacts:
        | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
    }>
        | undefined = undefined;

    onMount(async () => {
        contacts = await ensureContacts();
    });

    function formatTrustRelation(row: ExtendedTrustRelationRow) {
        switch (row.relation) {
            case 'trusts':
                return 'You accept their tokens';
            case 'trustedBy':
                return 'They accept your tokens';
            case 'mutuallyTrusts':
                return 'You accept each others tokens';
            case 'selfTrusts':
                return 'Self-trusted';
            default:
                return row.relation;
        }
    }

    $: orderedContacts = Object.keys($contacts?.data ?? {})
        .filter(a => $contacts?.data[a].avatarInfo?.isHuman || $contacts?.data[a].avatarInfo?.version === 1)
        .sort((a, b) => {
        /*
                    // Alphabetical sorting by contact name
                    const aRelation = $contacts?.data[a]?.contactProfile?.name;
                    const bRelation = $contacts?.data[b]?.contactProfile?.name;
                    return aRelation.localeCompare(bRelation);
                */
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
    <div class="flex flex-col p-0 px-4 sm:py-4 w-full sm:border sm:rounded-lg overflow-x-auto divide-y">
        {#each orderedContacts as address}
            <!-- TODO: use the generic list component -->
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
                            <!-- {#if $contacts?.data[address].row.relation === 'trusts'}
                                <img
                                        src="/incoming.svg"
                                        alt="Incoming trust"
                                        class="w-3 h-3 inline"
                                />
                            {/if}
                            {#if $contacts?.data[address].row.relation === 'trustedBy'}
                                <img
                                        src="/outgoing.svg"
                                        alt="Outgoing trust"
                                        class="w-3 h-3 inline"
                                />
                            {/if}
                            {#if $contacts?.data[address].row.relation === 'mutuallyTrusts'}
                                <img
                                        src="/mutual.svg"
                                        alt="Mutual trust"
                                        class="w-3 h-3 inline"
                                />
                            {/if} -->
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
        <!-- <div class="text-center py-4">
            <span class="text-gray-500">End of list</span>
        </div> -->
    </div>
</div>
