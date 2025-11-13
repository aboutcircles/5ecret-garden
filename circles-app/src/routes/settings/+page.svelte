<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { clearSession } from '$lib/stores/wallet.svelte';
  import { type Profile } from '@aboutcircles/sdk-types';
  import { runTask } from '$lib/utils/tasks';
  import GroupSetting from './editors/GroupSetting.svelte';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import {
    FallbackImageUrl,
    profilesEqual,
    removeProfileFromCache,
  } from '$lib/utils/profile';
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { Save as LSave, LogOut as LLogOut } from 'lucide';

  let newProfile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: '',
  });

  $effect(() => {
    if (avatarState.profile) {
      newProfile = { ...avatarState.profile };
    }
  });

  async function saveProfile() {
    if (!newProfile || !avatarState.avatar) {
      return;
    }

    // Remove fallback image URLs before saving
    if (
      newProfile.previewImageUrl &&
      Object.values(FallbackImageUrl).includes(
        newProfile.previewImageUrl as FallbackImageUrl
      )
    ) {
      newProfile.previewImageUrl = '';
    }

    await runTask({
      name: 'Updating profile ...',
      promise: (async () => {
        // Use the new SDK's profile.update method which handles:
        // 1. Pinning to IPFS via the profile service
        // 2. Updating metadata digest in the name registry
        await avatarState.avatar!.profile.update(newProfile);

        // Clear the profile cache for this address to force a reload
        removeProfileFromCache(avatarState.avatar!.address);

        // Reload the window to reflect changes
        window.location.reload();
      })(),
    });
  }

  let saveDisabled: boolean = $derived(
    profilesEqual(newProfile, avatarState.profile)
  );

  type Action = {
    id: string;
    label: string;
    iconNode: any;
    onClick: () => void;
    variant: 'primary' | 'ghost';
  };
  const actions: Action[] = [
    {
      id: 'save',
      label: 'Save',
      iconNode: LSave,
      onClick: saveProfile,
      variant: 'primary',
    },
    {
      id: 'disconnect',
      label: 'Disconnect',
      iconNode: LLogOut,
      onClick: clearSession,
      variant: 'ghost',
    },
  ];
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
>
  <svelte:fragment slot="title">
    <h1 class="h2">Settings</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">Profile, wallet</svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
        onclick={a.onClick}
        aria-label={a.label}
        disabled={a.id === 'save' ? saveDisabled : false}
      >
        <Lucide
          icon={a.iconNode}
          size={16}
          class={a.variant === 'primary'
            ? 'shrink-0 stroke-white'
            : 'shrink-0 stroke-black'}
        />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <span
      class="text-base md:text-lg font-semibold tracking-tight text-base-content"
    >
      Settings
    </span>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={a.onClick}
        aria-label={a.label}
        disabled={a.id === 'save' ? saveDisabled : false}
      >
        <Lucide
          icon={a.iconNode}
          size={20}
          class={a.variant === 'primary'
            ? 'shrink-0 stroke-white'
            : 'shrink-0 stroke-black'}
        />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  <div
    class="flex flex-col items-center md:border rounded-lg md:px-6 md:py-8 gap-y-4 pb-24 md:pb-8"
  >
    <div class="flex flex-col w-full gap-y-4">
      <ProfileEditor bind:profile={newProfile} showCustomizableFields={true} />
    </div>

    {#if avatarState.isGroup}
      <div class="w-full pt-2 border-t">
        <h2 class="font-bold mb-4">Advanced Group Settings</h2>
        <GroupSetting />
      </div>
    {/if}
  </div>
</PageScaffold>
