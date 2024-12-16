<script lang="ts">
    import type {PopupContentApi} from '$lib/components/PopUp.svelte';
    import {onMount} from 'svelte';
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import type {MigrateToV2Context} from '$lib/flows/migrateToV2/context';
    import {runTask} from '../../../routes/+layout.svelte';
    import {circles} from '$lib/stores/circles';
    import {avatar} from '$lib/stores/avatar';
    import {removeProfileFromCache} from '$lib/components/Avatar.svelte';

    export let contentApi: PopupContentApi;
    export let context: MigrateToV2Context;

    onMount(async () => {
    });

    async function migrate() {
        if (!$circles || !$avatar?.address) {
            throw new Error('Sdk or Avatar store not initialized');
        }
        if (!context.profile) {
            throw new Error('Profile not initialized');
        }

        runTask({
            name: `Migrating your Avatar ...`,
            promise: $circles.migrateAvatar(
                context.inviter ?? "0x0000000000000000000000000000000000000000"
                , $avatar.address
                , context.profile),
        }).then(async () => {
            removeProfileFromCache($avatar!.address);
            $avatar!.avatarInfo!.version = 2;
            $avatar!.avatarInfo!.v1Stopped = true;
            $avatar = $avatar;
        });

        contentApi.close();
    }
</script>

<FlowDecoration>
    <p class="text-2xl font-bold mt-14">Migrate</p>
    <p class="text-gray-500 mt-2">
        You're ready to migrate to Circles V2! Click the button below to start the
        migration process.
    </p>
    <div class="flex justify-end space-x-2 mt-6">
        <button
                type="submit"
                class="btn btn-primary text-white"
                on:click={() => migrate()}
        >
            Migrate to V2
        </button>
    </div>
</FlowDecoration>
