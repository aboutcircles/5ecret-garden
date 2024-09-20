<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import type {GroupRow} from "@circles-sdk/data";
    import {shortenAddress} from "$lib/utils/shared";

    export let item: GroupRow;
</script>

<div class="p-2 bg-base-100 hover:bg-base-200 rounded-lg items-center">
    <Avatar address={item.group}>
        {item.memberCount} Members<br/>
        {item.name} (<a class="underline" href={"https://gnosisscan.io/address/" + item.group}>{shortenAddress(item.group)}</a>)
    </Avatar>
</div>