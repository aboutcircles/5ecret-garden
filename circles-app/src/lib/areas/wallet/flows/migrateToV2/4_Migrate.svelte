<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { MIGRATE_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ProfilePreviewCard from '$lib/shared/ui/profile/ProfilePreviewCard.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';
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

  <div style="display:flex;flex-direction:column;gap:10px;">
    <!-- Invitation card -->
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};">
      <div style="padding:8px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Invitation</span>
        <button
          type="button"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
          onclick={editInvitation}
        ><Icon name="edit" size={9} stroke={T.inkMuted} /> Edit</button>
      </div>
      <div style="padding:10px 14px;">
        {#if hasInviter}
          <Avatar address={context.inviter} view="horizontal" clickable={false} />
        {:else}
          <span style="font-size:12.5px;color:{T.inkMuted};">Self migration — no inviter required.</span>
        {/if}
      </div>
    </div>

    <!-- Profile card -->
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};">
      <div style="padding:8px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Profile</span>
        <button
          type="button"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
          onclick={editProfile}
        ><Icon name="edit" size={9} stroke={T.inkMuted} /> Edit</button>
      </div>
      <div style="padding:10px 14px;">
        <ProfilePreviewCard profile={context.profile} title={profileName} />
      </div>
    </div>

    <!-- Contacts card -->
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};">
      <div style="padding:8px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Contacts ({selectedContactsCount})</span>
        <button
          type="button"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
          onclick={editContacts}
        ><Icon name="edit" size={9} stroke={T.inkMuted} /> Edit</button>
      </div>
      <div style="padding:10px 14px;">
        {#if (context.trustList ?? []).length === 0}
          <span style="font-size:12.5px;color:{T.inkMuted};">No contacts selected.</span>
        {:else}
          <div style="display:flex;flex-direction:column;gap:6px;">
            {#each context.trustList ?? [] as address (address)}
              <Avatar {address} view="horizontal" clickable={false} showTypeInfo={true} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <p style="font-size:12px;color:{T.inkMuted};line-height:1.5;padding:0 2px;">
    Ready to migrate to Circles V2. This will write your profile and set up trust relations on-chain.
  </p>

  {#if migrateAction.error}
    <StepAlert variant="error" message={migrateAction.error} />
  {/if}

  <div style="display:flex;justify-content:flex-end;margin-top:4px;">
    <button
      type="submit"
      style="
        height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:{migrateAction.loading ? 'wait' : 'pointer'};
        background:{T.primary};color:#fff;
        font-family:{T.fontSans};font-size:14px;font-weight:580;
        box-shadow:0 4px 12px rgba(88,73,212,0.25);
        display:inline-flex;align-items:center;gap:8px;
        opacity:{migrateAction.loading ? 0.7 : 1};
      "
      onclick={() => migrate()}
      disabled={migrateAction.loading}
    >
      {#if migrateAction.loading}
        <svg class="mg-spin" style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
      {/if}
      {migrateAction.loading ? 'Migrating…' : 'Migrate to V2'}
    </button>
  </div>
  </FlowStepScaffold>

<style>
  @keyframes mg-spin { from {} to { transform: rotate(360deg); } }
  .mg-spin { animation: mg-spin 0.8s linear infinite; }
</style>

