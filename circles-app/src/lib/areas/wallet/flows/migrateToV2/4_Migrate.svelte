<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import { MIGRATE_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import AdvancedDetails from '$lib/shared/ui/flow/AdvancedDetails.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import GetInvited from './1_GetInvited.svelte';
  import CreateProfile from './2_CreateProfile.svelte';
  import MigrateContacts from './3_MigrateContacts.svelte';
  import { circles as circlesStore } from '$lib/shared/state/circles';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { removeProfileFromCache } from '$lib/shared/utils/profile';
  import { popupControls } from '$lib/shared/state/popup';
  import { openStep, popToOrOpen, useAsyncAction } from '$lib/shared/flow';
  import { requireAvatar, requireCircles, requireProfile } from '$lib/shared/flow';
  import type { ReviewStepProps } from '$lib/shared/flow';
  import { get } from 'svelte/store';

  type Props = ReviewStepProps<MigrateToV2Context>;

  let { context }: Props = $props();

  const migrateAction = useAsyncAction(async () => {
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
  });

  const selectedContactsCount = $derived(context.trustList?.length ?? 0);
  const profileName = $derived(context.profile?.name?.trim() || 'Unnamed profile');
  const inviterLabel = $derived(context.inviter ? context.inviter : 'Self migration');
  const hasInviter = $derived(Boolean(context.inviter));

  function editInvitation() {
    popToOrOpen(GetInvited, {
      title: 'Get invited',
      props: { context },
    });
  }

  function editProfile() {
    popToOrOpen(CreateProfile, {
      title: 'Create Profile',
      props: { context },
    });
  }

  function editContacts() {
    popToOrOpen(MigrateContacts, {
      title: 'Migrate Contacts',
      props: { context },
    });
  }

  async function migrate() {
    await migrateAction.run();
  }
</script>

<FlowStepScaffold
  {...MIGRATE_FLOW_SCAFFOLD_BASE}
  step={4}
  title="Migrate"
  subtitle="Confirm and run the Circles V2 migration."
>

  <StepSection title="Review migration settings" subtitle="Change any step before submitting.">
    <StepReviewRow label="Invitation" value={inviterLabel} onChange={editInvitation} changeLabel="Edit" />
    <StepReviewRow label="Profile" value={profileName} onChange={editProfile} changeLabel="Edit" />
    <StepReviewRow
      label="Contacts"
      value={`${selectedContactsCount} selected`}
      onChange={editContacts}
      changeLabel="Edit"
    />
  </StepSection>

  <AdvancedDetails title="Advanced migration details" subtitle="Addresses">
    {#if hasInviter}
      <div class="text-xs text-base-content/60">Inviter address</div>
      <Avatar address={context.inviter} view="horizontal" clickable={false} bottomInfo={context.inviter} showTypeInfo={true} />
    {:else}
      <div class="text-sm text-base-content/70">Self migration (no inviter address).</div>
    {/if}
    <div class="text-xs text-base-content/60">Selected contacts</div>
    {#if (context.trustList ?? []).length === 0}
      <div class="text-sm text-base-content/70">No contacts selected.</div>
    {:else}
      <div class="space-y-2">
        {#each context.trustList ?? [] as address (address)}
          <Avatar {address} view="horizontal" clickable={false} bottomInfo={address} showTypeInfo={true} />
        {/each}
      </div>
    {/if}
  </AdvancedDetails>

  <p class="text-base-content/70 mt-2">
    You're ready to migrate to Circles V2! Click the button below to start the
    migration process.
  </p>

  {#if migrateAction.error}
    <StepAlert variant="error" message={migrateAction.error} className="mt-2" />
  {/if}

  <StepActionBar>
    {#snippet primary()}
      <button
        type="submit"
        class="btn btn-primary btn-sm"
        onclick={() => migrate()}
        disabled={migrateAction.loading}
      >
        {migrateAction.loading ? 'Migrating…' : 'Migrate to V2'}
      </button>
    {/snippet}
  </StepActionBar>
  </FlowStepScaffold>
