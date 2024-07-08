<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {circles} from "$lib/stores/circles";
    import {avatar} from "$lib/stores/avatar";
    import {goto} from "$app/navigation";
    import {canMigrate} from "$lib/guards/canMigrate";
    import type {Profile} from "@circles-sdk/profiles";

    let profile: Profile;

    async function migrateToV2() {
        const avatarAddress = $avatar?.address;
        if (!avatarAddress) {
            throw new Error('Avatar not found ($avatar is undefined)');
        }
        await $circles?.migrateAvatar(avatarAddress, "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB");

        await goto("/dashboard");
    }
</script>
<div class="flex flex-col items-center justify-center h-full p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Migrate to v2</h1>
    <p class="text-gray-700 mb-6 text-center">You can migrate your avatar to Circles V2.</p>



    <ActionButton disabled={!canMigrate($avatar?.avatarInfo)} action={migrateToV2}>
        Migrate
    </ActionButton>
</div>