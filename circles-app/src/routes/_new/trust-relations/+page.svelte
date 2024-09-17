<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import type {ExtendedTrustRelationRow} from "../../contacts/+page.svelte";
    import {ensureContacts} from "../../+layout.svelte";
    import {onMount} from "svelte";
    import type {Readable} from "svelte/store";
    import type {ContactList} from "$lib/stores/contacts";
    import ProfilePage from "$lib/components/ProfilePage.svelte";
    import {popupControls} from "$lib/components/PopUp.svelte";

    let contacts: Readable<{ data: ContactList, next: () => Promise<boolean>, ended: boolean }> | undefined = undefined;

    onMount(() => {
        contacts = ensureContacts();
    })

    function formatTrustRelation(row: ExtendedTrustRelationRow) {
        switch (row.relation) {
            case "trusts":
                return "You trust";
            case "trustedBy":
                return "Trusts you";
            case "mutuallyTrusts":
                return "Mutually trusted";
            case "selfTrusts":
                return "Self-trusted";
            default:
                return row.relation;
        }
    }
</script>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Contacts</div>
    <div class="overflow-x-auto">
        {#each Object.keys($contacts?.data ?? {}) as address}
            <a class="p-2 bg-base-100 hover:bg-base-200 rounded-lg items-center block" 
                on:click={(e) => {
                    $popupControls.open?.({
                        component: ProfilePage,
                        props: {
                            address: address
                        }
                    });
                    e.preventDefault();
                    return true;
                }}>
                <Avatar address={address}>
                    <div>
                        {#if $contacts?.data[address].row.relation === "trusts"}
                            <img src="/outgoing.svg" alt="Outgoing trust" class="w-3 h-3 inline"/>
                        {/if}
                        {#if $contacts?.data[address].row.relation === "trustedBy"}
                            <img src="/incoming.svg" alt="Incoming trust" class="w-3 h-3 inline"/>
                        {/if}
                        {#if $contacts?.data[address].row.relation === "mutuallyTrusts"}
                            <img src="/mutual.svg" alt="Mutual trust" class="w-3 h-3 inline"/>
                        {/if}
                        {#if $contacts?.data[address]}
                            <span>{formatTrustRelation($contacts.data[address].row)}</span>
                        {/if}
                    </div>
                </Avatar>
            </a>
        {/each}
        <div class="text-center py-4">
            <span class="text-gray-500">End of list</span>
        </div>
    </div>
</div>