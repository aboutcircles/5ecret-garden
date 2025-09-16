<script lang="ts">
    import {goto} from '$app/navigation';
    import ActionButton from '$lib/components/ActionButton.svelte';
    import Disclaimer from '$lib/components/Disclaimer.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {circles} from '$lib/stores/circles';
    import type {Avatar} from '@circles-sdk/sdk';

    async function registerHuman() {
        if (!$circles) {
            throw new Error('Wallet not connected ($circles is undefined)');
        }

        //TODO: why need to bind it as Avatar
        avatarState.avatar = (await $circles.registerHuman()) as Avatar;

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
            <img src="/person.svg" alt="Shoes" class="w-16 h-16 rounded-xl"/>
            <h2 class="card-title">Register person</h2>
            <div class="card-actions">
                <ActionButton action={registerHuman}>Create</ActionButton>
            </div>
        </div>
    </div>

</div>