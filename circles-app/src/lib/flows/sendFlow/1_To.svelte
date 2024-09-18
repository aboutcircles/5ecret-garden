<script lang="ts">
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import SelectContact from "$lib/pages/SelectContact.svelte";
    import type {ContactList} from "$lib/stores/contacts";
    import type {Profile} from "@circles-sdk/profiles";
    import {onMount} from "svelte";
    import {ensureContacts} from "../../../routes/+layout.svelte";
    import type {Readable} from "svelte/store";
    import SelectAsset from "./2_Asset.svelte";
    import type {SendFlowContext} from "$lib/flows/sendFlow/context";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";

    export let contentApi: PopupContentApi;
    export let context: SendFlowContext;

    let recentAddresses: Readable<{ data: ContactList, next: () => Promise<boolean>, ended: boolean }>;

    onMount(() => {
        recentAddresses = ensureContacts();
    });

    function handleSelect(event: CustomEvent<{ address: string, profile: Profile }>) {
        context.selectedAddress = event.detail.address;

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
    {#if recentAddresses}
        <SelectContact recentAddresses={$recentAddresses.data}
                       selectedAddress={context?.selectedAddress}
                       on:select={handleSelect}
        />
    {/if}
</FlowDecoration>