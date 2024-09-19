<script lang="ts">
    import {shortenAddress} from "$lib/utils/shared";
    import Avatar from "$lib/components/Avatar.svelte";
    import type {AvatarRow} from "@circles-sdk/data";

    export let item: AvatarRow;
</script>

<div class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg">
    <div class="col">
        <Avatar address={item.avatar} clickable={false}>
            {shortenAddress(item.avatar)}
        </Avatar>
    </div>
</div>