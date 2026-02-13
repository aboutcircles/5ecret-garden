<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import CreateProfile from './2_CreateProfile.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles as circlesStore } from '$lib/shared/state/circles';
  import type { AvatarRow } from '@circles-sdk/data';
  import { openStep } from '$lib/shared/flow/runtime';
  import type { Profile } from '@circles-sdk/profiles';
  import { settings } from '$lib/shared/state/settings.svelte';
  import InvitationPickerStep from '$lib/shared/ui/invitations/InvitationPickerStep.svelte';
  import { requireAvatar, requireCircles } from '$lib/shared/flow/guards';
  import { get } from 'svelte/store';

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
    const sdk = requireCircles(get(circlesStore));
    const avatar = requireAvatar(avatarState.avatar);
    if (!avatar.avatarInfo) {
      throw new Error('Avatar info not initialized');
    }
    canSelfMigrate = settings.ring ? true : await sdk.canSelfMigrate(avatar.avatarInfo);
    invitations = await sdk.data.getInvitations(avatar.avatarInfo.avatar);
  });
  async function next() {
    openStep({
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
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader
      step={1}
      total={4}
      title="Invitation"
      subtitle="Choose how to start your Circles V2 migration."
      labels={['Invitation', 'Profile', 'Contacts', 'Migrate']}
    />

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
    <StepAlert variant="info" message="You have no invitations." className="mt-2" />
    {#if canSelfMigrate}
      <p class="text-base-content/70 mt-2">You can migrate to v2.</p>
      <StepActionBar className="mt-6">
        {#snippet primary()}
          <button
            type="submit"
            class="btn btn-primary btn-sm"
            onclick={() => next()}
          >
            Continue
          </button>
        {/snippet}
      </StepActionBar>
    {:else}
      <p class="text-base-content/70 mt-2">
        You need to find someone who is already on Circles V2 to invite you.
      </p>
    {/if}
  {/if}
  </div>
</FlowDecoration>
