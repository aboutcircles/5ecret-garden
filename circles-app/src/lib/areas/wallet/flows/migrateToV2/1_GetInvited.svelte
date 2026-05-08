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
  import type { AvatarRow } from '@circles-sdk/data';
  import { openStep } from '$lib/shared/flow';
  import type { Profile } from '@circles-sdk/profiles';
  import { settings } from '$lib/shared/state/settings.svelte';
  import InvitationPickerStep from '$lib/shared/ui/invitations/InvitationPickerStep.svelte';
  import { requireAvatar, requireCircles } from '$lib/shared/flow';
  import { get } from 'svelte/store';
  import { migrationDoesNotRequireInvitation } from './invitationRequirements';
  import { T } from '$lib/design-system/tokens.js';

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
    if (migrationDoesNotRequireInvitation(avatar.avatarInfo)) {
      await next();
      return;
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
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
      <span class="loading loading-spinner loading-xs" style="color:{T.primary};"></span>
      <span style="font-size:12.5px;color:{T.inkMuted};">Loading invitations…</span>
    </div>
  {:else if invitations.length > 0}
    <p style="font-size:12.5px;color:{T.inkMuted};margin:0;">You have been invited by:</p>
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};padding:12px 14px;">
      <InvitationPickerStep
        {invitations}
        onSelect={(address) => selectInvitation(address)}
      />
    </div>
  {:else}
    <StepAlert variant="info" message="You have no invitations yet." />
    {#if canSelfMigrate}
      <p style="font-size:12.5px;color:{T.inkMuted};line-height:1.5;margin:0;">You're eligible for self-migration to Circles V2.</p>
      <div style="display:flex;justify-content:flex-end;margin-top:8px;">
        <StepActionButtons primaryLabel="Continue" primaryType="submit" onPrimary={next} />
      </div>
    {:else}
      <p style="font-size:12.5px;color:{T.inkMuted};line-height:1.5;margin:0;">
        You need an invitation from someone already on Circles V2 to migrate.
      </p>
    {/if}
  {/if}
</FlowStepScaffold>
