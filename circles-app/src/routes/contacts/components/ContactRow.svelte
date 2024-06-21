<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {avatar} from "$lib/stores/avatar";
    import type {TrustRelationRowWithInvitationFlag} from "../+page.svelte";

    export let row: TrustRelationRowWithInvitationFlag;

    async function addTrust() {
        await $avatar?.trust(row.objectAvatar);
    }

    async function removeTrust() {
        await $avatar?.untrust(row.objectAvatar);
    }

    async function send() {
        goto(`/send/${row.objectAvatar}`);
    }

    $: date = new Date(row.timestamp * 1000);
    $: isIncoming = row.relation === "trustedBy";
    $: isOutgoing = row.relation === "trusts";
    $: isMutual = row.relation === "mutuallyTrusts";
    $: isInvitedByMe = row.invitedByMe;
</script>

<style>
    .icon-container {
        position: relative;
        display: inline-block;
    }

    .envelope-icon {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 16px;
        height: 16px;
    }
</style>

<div class="icon-container">
    {#if isMutual}
        <img src="mutual.svg" alt="Mutual trust" class="w-12 h-12 rounded-full">
    {:else if isIncoming}
        <img src="incoming.svg" alt="Is trusting you" class="w-12 h-12 rounded-full">
    {:else if isOutgoing}
        <img src="outgoing.svg" alt="You are trusting" class="w-12 h-12 rounded-full">
    {/if}

    {#if isInvitedByMe}
        <img src="envelope.svg" alt="Invited by me" class="envelope-icon">
    {/if}
</div>

<div class="ml-4 flex-grow">
    <p class="text-sm font-medium">{row.objectAvatar}</p>
    <p class="text-xs text-gray-500">{date.toLocaleDateString()} - {date.toLocaleTimeString()}</p>
</div>

{#if isOutgoing}
    <ActionButton action={removeTrust}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
             class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
    </ActionButton>
{:else if isMutual}
    <ActionButton action={removeTrust}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
             class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 4.5-15 15m0 0h11.25m-11.25 0V8.25"/>
        </svg>
    </ActionButton>
{:else if isIncoming}
    <ActionButton action={addTrust}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
             class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>
        </svg>
    </ActionButton>
{/if}
<ActionButton action={send}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
         class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/>
    </svg>
</ActionButton>