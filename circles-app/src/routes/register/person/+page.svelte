<script lang="ts">
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import type {Avatar} from "@circles-sdk/sdk";

    async function registerPerson() {
        if (!$circles) {
            throw new Error('Wallet not connected ($circles is undefined)');
        }

        $avatar = <Avatar>await $circles.registerHuman();

        await goto("/dashboard");
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Register as person</h2>
        <div class="mt-3 space-y-2">
            <ActionButton action={registerPerson}>
                Create
            </ActionButton>
        </div>
    </div>
</div>
