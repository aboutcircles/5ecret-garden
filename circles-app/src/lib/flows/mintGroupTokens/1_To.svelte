<script lang="ts">
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import SelectContact from "$lib/pages/SelectContact.svelte";
    import type {ContactList} from "$lib/stores/contacts";
    import type {Profile} from "@circles-sdk/profiles";
    import {onMount} from "svelte";
    import {ensureContacts} from "../../../routes/+layout.svelte";
    import {derived, type Readable} from "svelte/store";
    import type {GroupMintFlowContext} from "$lib/flows/mintGroupTokens/context";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";
    import SelectAsset from "$lib/flows/mintGroupTokens/2_Asset.svelte";

    export let contentApi: PopupContentApi;
    export let context: GroupMintFlowContext;

    // Original contacts store
    let contacts: Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
    }> | undefined = undefined;

    // Derived store that includes only group contacts
    let groupContacts: Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
    }> | undefined = undefined;

    onMount(async () => {
        // Ensure contacts are loaded
        contacts = await ensureContacts();

        if (contacts) {
            // Create a derived store that filters contacts to only groups
            groupContacts = derived(contacts, ($contacts) => ({
                data: Object.fromEntries(
                    Object.entries($contacts.data).filter(
                        ([, contactItem]) => contactItem.avatarInfo?.type === "CrcV2_RegisterGroup"
                    )
                ),
                next: $contacts.next,
                ended: $contacts.ended,
            }));
        }
    });

    function handleSelect(event: CustomEvent<{ address: string; profile: Profile }>) {
        context.selectedAddress = event.detail.address;
        console.log("Selected address", event.detail.address);

        contentApi.open({
            title: "Select Asset",
            component: SelectAsset,
            props: {
                context: context
            }
        });
    }
</script>

<FlowDecoration>
    {#if groupContacts}
        <SelectContact
                store={groupContacts}
                addressListTitle="Groups"
                selectedAddress={context?.selectedAddress}
                on:select={handleSelect}
        />
    {:else}
        <p>Loading contacts...</p>
    {/if}
</FlowDecoration>
