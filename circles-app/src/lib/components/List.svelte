<script lang="ts" context="module">
    export interface RowItem {
        [key: string]: any;
    }
</script>
<script lang="ts">
    import {createEventDispatcher, type SvelteComponent} from "svelte";

    const eventDispatcher = createEventDispatcher();

    export let rowComponent: typeof SvelteComponent;
    export let rows: RowItem[] = [];

    function onItemClick(item: RowItem, index: number) {
        eventDispatcher('itemClick', {item, index});
    }
</script>

<ul class="space-y-3">
    {#each rows as row, index}
        <li class="bg-white p-3 rounded shadow flex items-center"
            on:click={() => onItemClick(row, index)}>
            <svelte:component this={rowComponent} row={row}/>
        </li>
    {/each}
</ul>
