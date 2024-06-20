<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import List from "$lib/components/List.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import type {TrustRelationRow} from "@circles-sdk/data";
    import ContactRow from "./components/ContactRow.svelte";

    $: rows = <TrustRelationRow[]>[];


    async function refresh() {
        rows = await $avatar?.getTrustRelations() ?? [];
    }

    onMount(() => {
        refresh();
        return $avatar?.events.subscribe(async event => {
            if (event.$event !== "CrcV1_Trust"
                && event.$event !== "CrcV2_Trust") {
                return;
            }
            await refresh();
        });
    });

    async function addContact() {
        await goto('/contacts/add');
    }
</script>

<div class="flex justify-between items-center mb-4">
    <ActionButton action={addContact}>
        Add contact
    </ActionButton>
</div>

<List rows={rows} rowComponent={ContactRow}/>
