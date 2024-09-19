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

    onMount(async () => {
        contacts = await ensureContacts();
    })

    function formatTrustRelation(row: ExtendedTrustRelationRow) {
        switch (row.relation) {
            case "trusts":
                return "You accept their tokens";
            case "trustedBy":
                return "They accept your tokens";
            case "mutuallyTrusts":
                return "You accept each others tokens";
            case "selfTrusts":
                return "Self-trusted";
            default:
                return row.relation;
        }
    }

    $: orderedContacts = Object.keys($contacts?.data ?? {}).sort((a, b) => {
        const aRelation = $contacts?.data[a].row.relation;
        const bRelation = $contacts?.data[b].row.relation;
        if (aRelation === "mutuallyTrusts" && bRelation !== "mutuallyTrusts") {
            return -1;
        }
        if (aRelation === "trusts" && bRelation === "trustedBy") {
            return -1;
        }
        if (aRelation === bRelation) {
            return 0;
        }
        if (bRelation === "mutuallyTrusts" && aRelation !== "mutuallyTrusts") {
            return 1;
        }
        if (bRelation === "trusts" && aRelation === "trustedBy") {
            return 1;
        }
        return 0;
    });
</script>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Contacts</div>
    <div class="overflow-x-auto">
        {#each orderedContacts as address}
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
                            <img src="/incoming.svg" alt="Incoming trust" class="w-3 h-3 inline"/>
                        {/if}
                        {#if $contacts?.data[address].row.relation === "trustedBy"}
                            <img src="/outgoing.svg" alt="Outgoing trust" class="w-3 h-3 inline"/>
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