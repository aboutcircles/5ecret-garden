<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {circles} from "$lib/stores/circles";
    import {avatar} from "$lib/stores/avatar";
    import type {Avatar} from "@circles-sdk/sdk";

    async function registerPerson() {
        await goto("/register/person");
    }

    async function registerAsGroup() {
        await goto("/register/group");
    }
</script>

<div class="flex flex-col items-center justify-center h-full p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Register a new Account</h1>
    <p class="text-gray-700 mb-6 text-center">Click the button below to register your wallet at Circles.</p>

    <ActionButton action={registerPerson}>
        Register as person
    </ActionButton>

    {#if $circles?.v2Hub}
        <ActionButton action={registerAsGroup}>
            Register as group
        </ActionButton>
    {/if}
</div>