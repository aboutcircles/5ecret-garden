<script lang="ts">
    import GenericList from "$lib/components/GenericList.svelte";
    import {createGroups} from "$lib/stores/groups";
    import {onMount} from "svelte";
    import type {Readable} from "svelte/store";
    import type {GroupRow} from "@circles-sdk/data";
    import GroupRowView from "./GroupRowView.svelte";

    let groups: Readable<{
        data: GroupRow[],
        next: () => Promise<boolean>,
        ended: boolean
    }>;
    onMount(async () => {
        groups = await createGroups();
    });
</script>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Groups</div>
    <div class="overflow-x-auto">
        {#if groups}
            <GenericList store={groups} row={GroupRowView} />
        {/if}
    </div>
</div>