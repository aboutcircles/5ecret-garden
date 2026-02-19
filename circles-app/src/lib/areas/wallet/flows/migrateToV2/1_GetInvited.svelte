<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
  import { MIGRATE_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import CreateProfile from './2_CreateProfile.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles as circlesStore } from '$lib/shared/state/circles';
  import type { AvatarRow } from '@aboutcircles/sdk-types';
  import { openStep } from '$lib/shared/flow';
  import type { Profile } from '@aboutcircles/sdk-types';
  import { settings } from '$lib/shared/state/settings.svelte';
  import InvitationPickerStep from '$lib/shared/ui/invitations/InvitationPickerStep.svelte';
  import { requireAvatar, requireCircles } from '$lib/shared/flow';
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
<FlowStepScaffold
  {...MIGRATE_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Get invited"
  subtitle="Choose how to start your Circles V2 migration."
>

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
      <StepActionButtons
        className="mt-6"
        primaryLabel="Continue"
        primaryType="submit"
        onPrimary={next}
      />
    {:else}
      <p class="text-base-content/70 mt-2">
        You need to find someone who is already on Circles V2 to invite you.
      </p>
    {/if}
  {/if}
</FlowStepScaffold>
