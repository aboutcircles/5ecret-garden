<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import type { MigrateToV2Context } from '$lib/flows/migrateToV2/context';
  import CreateProfile from './2_CreateProfile.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import type { AvatarRow } from '@circles-sdk/data';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { Profile } from '@circles-sdk/profiles';
  import { settings } from '$lib/stores/settings.svelte';

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
    popupControls.open({
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
  <p class="text-2xl font-bold">Find an invitation</p>
  {#if !invitations}
    <p class="text-gray-500 mt-2">Loading invitations...</p>
  {:else if invitations.length > 0}
    <p class="text-gray-500 mt-2">You have been invited by:</p>
    <div
      class="mt-2 flex flex-col gap-y-2 w-full divide-y rounded-lg p-4 border border-base-300"
    >
      {#each invitations as invitation}
        <div class="pt-2">
          <button
            type="button"
            class="text-gray-500 hover:bg-black/5 w-full flex p-2 rounded-lg"
            onclick={() => selectInvitation(invitation.avatar)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                selectInvitation(invitation.avatar);
            }}
          >
            <Avatar
              address={invitation.avatar}
              clickable={false}
              view="horizontal"
            />
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-gray-500 mt-2">You have no invitations.</p>
    {#if canSelfMigrate}
      <p class="text-gray-500 mt-2">You can migrate to v2.</p>
      <div class="flex justify-end space-x-2 mt-6">
        <button
          type="submit"
          class="btn btn-primary text-white"
          onclick={() => next()}
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
