<script lang="ts">
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import {onMount} from "svelte";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";
    import type {MigrateToV2Context} from "$lib/flows/migrateToV2/context";
    import Avatar from "$lib/components/Avatar.svelte";
    import {ensureContacts} from "../../../routes/+layout.svelte";
    import type {Readable} from "svelte/store";
    import type {ContactList} from "$lib/stores/contacts";
    import type {ExtendedTrustRelationRow} from "../../../routes/contacts/+page.svelte";
    import Migrate from "./3_Migrate.svelte";

    export let contentApi: PopupContentApi;
    export let context: MigrateToV2Context;

    let contacts: Readable<{ data: ContactList, next: () => Promise<boolean>, ended: boolean }> | undefined = undefined;
    let selectedAddresses: string[] = [];

    onMount(async () => {
        contacts = await ensureContacts();
        selectedAddresses = context.trustList ?? Object.keys($contacts?.data ?? {});
        console.log("Selected addresses", selectedAddresses);
    });

    async function next() {
        contentApi.open({
            title: "Run Migration",
            component: Migrate,
            props: {
                context: context
            }
        });
    }

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
        /*
            // Alphabetical sorting by contact name
            const aRelation = $contacts?.data[a]?.contactProfile?.name;
            const bRelation = $contacts?.data[b]?.contactProfile?.name;
            return aRelation.localeCompare(bRelation);
         */
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

<FlowDecoration>
    <p>
        Select the contacts you want to keep in your new Circles V2 profile. By default, all your contacts are selected.
    </p>
    <div class="mt-6">
        {#each orderedContacts as address}
            <a class="p-2 bg-base-100 hover:bg-base-200 rounded-lg items-center block"
               on:click={(e) => {
                   console.log("Selected address", address);
                   // Toggle selection
                    if (selectedAddresses.includes(address)) {
                         selectedAddresses = selectedAddresses.filter((a) => a !== address);
                    } else {
                         selectedAddresses = [...selectedAddresses, address];
                    }
                    context.trustList = selectedAddresses;
               }}>
                <Avatar contentApi={undefined}
                        pictureOverlayUrl={selectedAddresses.includes(address) ? "/check.svg" : undefined}
                        address={address}
                        clickable={false}>
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
        {#if orderedContacts.length === 0}
            <p class="text-center mt-4">No contacts to migrate</p>
        {/if}
    </div>
    <div class="flex justify-end space-x-2 mt-6">
        <button type="submit" class="btn btn-primary px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600"
                on:click={() => next()}>
            Next
        </button>
    </div>
</FlowDecoration>
