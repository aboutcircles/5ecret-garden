<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import GetInvited from './1_GetInvited.svelte';
  import CreateProfile from './2_CreateProfile.svelte';
  import MigrateContacts from './3_MigrateContacts.svelte';
  import { circles as circlesStore } from '$lib/shared/state/circles';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { removeProfileFromCache } from '$lib/shared/utils/profile';
  import { popupControls } from '$lib/shared/state/popup';
  import { openStep } from '$lib/shared/flow/runtime';
  import { requireAvatar, requireCircles, requireProfile } from '$lib/shared/flow/guards';
  import type { ReviewStepProps } from '$lib/shared/flow/contracts';
  import { get } from 'svelte/store';

  type Props = ReviewStepProps<MigrateToV2Context>;

  let { context }: Props = $props();

  let migrating = $state(false);
  let localError: string | null = $state(null);

  const selectedContactsCount = $derived(context.trustList?.length ?? 0);
  const profileName = $derived(context.profile?.name?.trim() || 'Unnamed profile');
  const inviterLabel = $derived(context.inviter ? context.inviter : 'Self migration');

  function editInvitation() {
    const didPop = popupControls.popTo((entry) => entry.component === GetInvited);
    if (!didPop) {
      openStep({
        title: 'Get invited',
        component: GetInvited,
        props: { context },
      });
    }
  }

  function editProfile() {
    const didPop = popupControls.popTo((entry) => entry.component === CreateProfile);
    if (!didPop) {
      openStep({
        title: 'Create Profile',
        component: CreateProfile,
        props: { context },
      });
    }
  }

  function editContacts() {
    const didPop = popupControls.popTo((entry) => entry.component === MigrateContacts);
    if (!didPop) {
      openStep({
        title: 'Migrate Contacts',
        component: MigrateContacts,
        props: { context },
      });
    }
  }

  async function migrate() {
    if (migrating) return;
    localError = null;
    migrating = true;

    try {
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
    } catch (e: unknown) {
      localError = e instanceof Error ? e.message : 'Migration failed. Please try again.';
    } finally {
      migrating = false;
    }
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
  <FlowStepHeader
    step={4}
    total={4}
    title="Migrate"
    subtitle="Confirm and run the Circles V2 migration."
    labels={['Invitation', 'Profile', 'Contacts', 'Migrate']}
  />

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

  <p class="text-base-content/70 mt-2">
    You're ready to migrate to Circles V2! Click the button below to start the
    migration process.
  </p>

  {#if localError}
    <StepAlert variant="error" message={localError} className="mt-2" />
  {/if}

  <StepActionBar>
    {#snippet primary()}
      <button
        type="submit"
        class="btn btn-primary btn-sm"
        onclick={() => migrate()}
        disabled={migrating}
      >
        {migrating ? 'Migrating…' : 'Migrate to V2'}
      </button>
    {/snippet}
  </StepActionBar>
  </div>
</FlowDecoration>
