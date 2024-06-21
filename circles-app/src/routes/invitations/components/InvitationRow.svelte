<script lang="ts">
    import type {InvitationRow} from "@circles-sdk/data";

    export let row: InvitationRow;

    $: date = new Date(row.timestamp * 1000);
</script>

<img src="envelope.svg" alt="You are trusting" class="w-12 h-12 rounded-full">

<div class="ml-4 flex-grow">
    <p class="text-sm font-medium">{row.invited}</p>
    <p class="text-xs text-gray-500">{date.toLocaleDateString()} - {date.toLocaleTimeString()}</p>
</div>
