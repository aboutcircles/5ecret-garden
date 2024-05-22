<script lang="ts" context="module">
    // TODO: Remove this mock data and fetch the actual trust relations.
    export type TrustRelationRow = {
        subjectAvatar: string;
        relation: TrustRelation;
        objectAvatar: string;
        timestamp: number;
    }
</script>
<script lang="ts">
    import TransactionRow from "../dashboard/components/TransactionRow.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import List from "$lib/components/List.svelte";
    import {onMount} from "svelte";

    $: rows = [];

    onMount(async () => {
        // TODO: Get the list of trust relations for the account.
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

<List rows={rows} rowComponent={TransactionRow}/>
