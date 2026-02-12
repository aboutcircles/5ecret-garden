<script lang="ts">
  import { onMount } from 'svelte';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import { circles as circlesStore } from '$lib/shared/state/circles';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { removeProfileFromCache } from '$lib/shared/utils/profile';
  import { popupControls } from '$lib/shared/state/popup';
  import { requireAvatar, requireCircles, requireProfile } from '$lib/shared/flow/guards';
  import type { ReviewStepProps } from '$lib/shared/flow/contracts';
  import { get } from 'svelte/store';

  type Props = ReviewStepProps<MigrateToV2Context>;

  let { context }: Props = $props();

  onMount(async () => {});

  async function migrate() {
    const sdk = requireCircles(get(circlesStore));
    const avatar = requireAvatar(avatarState.avatar);
    const profile = requireProfile(context.profile);

    await runTask({
      name: `Migrating your Avatar ...`,
      promise: sdk.migrateAvatar(
        context.inviter ?? '0x0000000000000000000000000000000000000000',
        avatar.address,
        profile
      ),
    });

    // On success, refresh local cache/state
    removeProfileFromCache(avatar.address);
    avatar.avatarInfo!.version = 2;
    avatar.avatarInfo!.v1Stopped = true;

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
      class="btn btn-primary"
      onclick={() => migrate()}
    >
      Migrate to V2
    </button>
  </div>
</FlowDecoration>
