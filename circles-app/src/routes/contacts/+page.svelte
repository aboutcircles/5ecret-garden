<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import List from "$lib/components/List.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import type {TrustRelationRow} from "@circles-sdk/sdk";
    import ContactRow from "./components/ContactRow.svelte";

    $: rows = <TrustRelationRow[]>[];

    onMount(async () => {
        rows = await $avatar?.getTrustRelations() ?? [];
    });

    async function addContact() {
        goto('/contacts/add');
    }
</script>

<div class="flex justify-between items-center mb-4">
    <ActionButton action={addContact}>
        Add contact
    </ActionButton>
</div>

<List rows={rows} rowComponent={ContactRow}/>
