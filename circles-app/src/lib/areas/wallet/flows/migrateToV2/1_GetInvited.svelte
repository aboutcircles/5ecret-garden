<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import CreateProfile from './2_CreateProfile.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import type { AvatarRow } from '@circles-sdk/data';
  import { openFlowPopup } from '$lib/shared/state/popup';
  import type { Profile } from '@circles-sdk/profiles';
  import { settings } from '$lib/shared/state/settings.svelte';
  import InvitationPickerStep from '$lib/shared/ui/invitations/InvitationPickerStep.svelte';

  interface Props {
    context?: MigrateToV2Context;
  }

  let { context = $bindable({
    inviter: undefined,
    profile: <Profile>{
      name: ''
    },
    trustList: []
  }) }: Props = $props();
  let canSelfMigrate = $state(false);
  let invitations: AvatarRow[] | undefined = $state();
  onMount(async () => {
    if (!avatarState.avatar?.avatarInfo || !$circles) {
      throw new Error('Avatar store or SDK not initialized');
    }
    canSelfMigrate = settings.ring ? true : await $circles.canSelfMigrate(avatarState.avatar.avatarInfo);
    invitations = await $circles.data.getInvitations(avatarState.avatar.avatarInfo.avatar);
  });
  async function next() {
    openFlowPopup({
      title: 'Create Profile',
      component: CreateProfile,
      props: {
        context: context,
      },
    });
  }
  function selectInvitation(inviter: `0x${string}`) {
    context.inviter = inviter;
    next();
  }
</script>

<FlowDecoration>
  {#if !invitations}
    <p class="text-base-content/70 mt-2">Loading invitations...</p>
  {:else if invitations.length > 0}
    <p class="text-base-content/70 mt-2">You have been invited by:</p>
    <div class="mt-2 w-full rounded-lg p-4 border">
      <InvitationPickerStep
        {invitations}
        onSelect={(address) => selectInvitation(address)}
      />
    </div>
  {:else}
    <p class="text-gray-500 mt-2">You have no invitations.</p>
    {#if canSelfMigrate}
      <p class="text-base-content/70 mt-2">You can migrate to v2.</p>
      <div class="flex justify-end space-x-2 mt-6">
        <button
          type="submit"
          class="btn btn-primary"
          onclick={() => next()}
        >
          Next
        </button>
      </div>
    {:else}
      <p class="text-base-content/70 mt-2">
        You need to find someone who is already on Circles V2 to invite you.
      </p>
    {/if}
  {/if}
</FlowDecoration>
