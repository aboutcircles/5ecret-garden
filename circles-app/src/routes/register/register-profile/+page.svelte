<script lang="ts">
    import ActionButton from '$lib/components/ActionButton.svelte';
    import { circles } from '$lib/stores/circles';
    import { wallet } from '$lib/stores/wallet.svelte';
    import type { Profile } from '@circles-sdk/profiles';
    import ProfileEditor from '$lib/components/ProfileEditor.svelte';
    import { onMount } from 'svelte';
    import Disclaimer from '$lib/components/Disclaimer.svelte';

    let profile: Profile = $state({ name: '', description: '', previewImageUrl: '', imageUrl: undefined });

    onMount(async () => {
        if ($wallet?.address) {
            const cid = await $circles?.data?.getMetadataCidForAddress($wallet.address);
            profile = cid ? ((await $circles?.profiles?.get(cid)) ?? profile) : profile;
        }
    });

    async function registerProfile() { await $circles?.createOrUpdateProfile(profile); }
</script>

<div class="page page-pt page-stack page--lg">
    <button class="btn btn-ghost btn-square btn-sm w-fit" onclick={() => history.back()}>
        <img src="/arrow-left.svg" alt="" class="icon" aria-hidden="true" />
    </button>

    <Disclaimer />

    <div class="section">
        <div class="flex flex-col items-center text-center gap-4">
            <img src="/person.svg" alt="person" class="w-16 h-16 rounded-xl" />
            <h2 class="text-xl font-semibold">Register profile</h2>
            <ProfileEditor bind:profile />
            <ActionButton action={registerProfile} disabled={profile.name.trim().length < 1}>Create</ActionButton>
        </div>
    </div>
</div>
