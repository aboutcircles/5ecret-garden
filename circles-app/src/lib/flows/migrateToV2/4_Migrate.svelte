<script lang="ts">
  import { onMount } from 'svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import type { MigrateToV2Context } from '$lib/flows/migrateToV2/context';
  import { circles } from '$lib/stores/circles';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { runTask } from '$lib/utils/tasks';
  import { removeProfileFromCache } from '$lib/utils/profile';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    context: MigrateToV2Context;
  }

  let { context }: Props = $props();

  onMount(async () => {});

  async function migrate() {
    if (!$circles || !avatarState.avatar?.address) {
      throw new Error('Sdk or Avatar store not initialized');
    }
    if (!context.profile) {
      throw new Error('Profile not initialized');
    }

    runTask({
      name: `Migrating your Avatar ...`,
      promise: $circles.migrateAvatar(
        context.inviter ?? '0x0000000000000000000000000000000000000000',
        avatarState.avatar.address,
        context.profile
      ),
    }).then(async () => {
      removeProfileFromCache(avatarState.avatar!.address);
      avatarState.avatar!.avatarInfo!.version = 2;
      avatarState.avatar!.avatarInfo!.v1Stopped = true;
    });

    popupControls.close();
  }
</script>

<FlowDecoration>
  <p class="text-gray-500 mt-2">
    You're ready to migrate to Circles V2! Click the button below to start the
    migration process.
  </p>
  <div class="flex justify-end space-x-2 mt-6">
    <button
      type="submit"
      class="btn btn-primary text-white"
      onclick={() => migrate()}
    >
      Migrate to V2
    </button>
  </div>
</FlowDecoration>
