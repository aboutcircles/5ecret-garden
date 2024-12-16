<script lang="ts">
    import type {PopupContentApi} from '$lib/components/PopUp.svelte';
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import type {MigrateToV2Context} from '$lib/flows/migrateToV2/context';
    import CreateProfile from './1_CreateProfile.svelte';
    import {onMount} from 'svelte';
    import {avatar} from '$lib/stores/avatar';
    import {circles} from '$lib/stores/circles';
    import type {AvatarRow} from "@circles-sdk/data";
    import Avatar from "$lib/components/Avatar.svelte";

    export let contentApi: PopupContentApi;
    export let context: MigrateToV2Context;

    let canSelfMigrate = false;
    let invitations: AvatarRow[] | undefined;

    onMount(async () => {
        if (!$avatar?.avatarInfo || !$circles) {
            throw new Error('Avatar store or SDK not initialized');
        }

        canSelfMigrate = await $circles.canSelfMigrate($avatar.avatarInfo);
        invitations = await $circles.data.getInvitations($avatar.avatarInfo.avatar);
    });

    async function next() {
        contentApi.open({
            title: 'Create Profile',
            component: CreateProfile,
            props: {
                context: context,
            },
        });
    }

    function selectInvitation(inviter: string) {
        context.inviter = inviter;
        next();
    }
</script>

<FlowDecoration>
    <p class="text-2xl font-bold mt-14">Find an invitation</p>
    {#if !invitations}
        <p class="text-gray-500 mt-2">
            Loading invitations...
        </p>
    {:else if invitations.length > 0}
        <p class="text-gray-500 mt-2">
            You have been invited by:
        </p>
        <ul class="mt-2">
            {#each invitations as invitation}
                <li class="text-gray-500" on:click={e => selectInvitation(invitation.avatar)}>
                    <Avatar address={invitation.avatar} clickable={false}/>
                </li>
            {/each}
        </ul>
    {:else}
        <p class="text-gray-500 mt-2">
            You have no invitations.
        </p>
        {#if canSelfMigrate}
            <p class="text-gray-500 mt-2">
                You can migrate to v2.
            </p>
            <div class="flex justify-end space-x-2 mt-6">
                <button
                        type="submit"
                        class="btn btn-primary text-white"
                        on:click={() => next()}
                >
                    Next
                </button>
            </div>
        {:else}
            <p class="text-gray-500 mt-2">
                You need to find someone who is already on Circles V2 to invite you.
            </p>
        {/if}
    {/if}
</FlowDecoration>
