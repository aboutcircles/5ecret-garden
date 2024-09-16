<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import type {GroupRow} from "@circles-sdk/data";

    export let item: GroupRow;
</script>

<div class="p-2 bg-base-100 hover:bg-base-200 rounded-lg items-center">
    <Avatar address={item.group}>
        {item.memberCount} Members<br/>
        {item.name} ({item.group})
    </Avatar>
</div>