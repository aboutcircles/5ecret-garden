<script lang="ts">
    import {goto} from '$app/navigation';
    import ActionButton from '$lib/components/ActionButton.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {circles} from '$lib/stores/circles';
    import type {Avatar} from '@circles-sdk/sdk';
    import type {Profile} from '@circles-sdk/profiles';
    import Disclaimer from '$lib/components/Disclaimer.svelte';

    let profile: Profile = $state({name: '', description: '', previewImageUrl: '', imageUrl: undefined});

    async function registerOrganization() {
        if (!$circles) throw new Error('Wallet not connected ($circles is undefined)');
        avatarState.avatar = await $circles.registerOrganizationV2(profile) as Avatar;
        await goto('/dashboard');
    }
</script>

<div class="page page-pt page-stack page--lg">
    <button class="btn btn-ghost btn-square btn-sm w-fit" onclick={() => history.back()}>
        <img src="/arrow-left.svg" alt="" class="icon" aria-hidden="true"/>
    </button>

    <Disclaimer/>

    <div class="section">
        <div class="flex flex-col items-center text-center gap-4">
            <img src="/organization.svg" alt="organization" class="w-16 h-16 rounded-xl"/>
            <div class="space-y-4">
                <h2 class="text-xl font-semibold">Register organization</h2>
                <label class="form-control w-full">
                    <span class="label-text">Name</span>
                    <input bind:value={profile.name} type="text" class="input input-bordered w-full"/>
                </label>
                <ActionButton action={registerOrganization} disabled={profile.name.trim().length < 1}>Create
                </ActionButton>
            </div>
        </div>
    </div>
</div>
