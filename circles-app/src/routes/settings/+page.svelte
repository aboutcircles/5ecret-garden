<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { clearSession, wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { canMigrate } from '$lib/guards/canMigrate';
  import { type Profile } from '@circles-sdk/profiles';
  import { runTask } from '$lib/utils/tasks';
  import MigrateToV2 from '$lib/flows/migrateToV2/1_GetInvited.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import GroupSetting from './editors/GroupSetting.svelte';
  import { ethers } from 'ethers';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import { FallbackImageUrl, profilesEqual } from '$lib/utils/profile';

  async function saveProfileData(profile: Profile): Promise<string> {
    if (!$circles?.profiles) {
      throw new Error('Profiles not available');
    }

    return await $circles.profiles.create(profile);
  }

  let newProfile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: '',
  });

  async function migrateToV2() {
    popupControls.open({
      title: 'Migrate to v2',
      component: MigrateToV2,
      props: {},
    });
  }

  async function stopV1() {
    const v1TokenAddress = avatarState.avatar?.avatarInfo?.v1Token;
    if (!$wallet || !v1TokenAddress) {
      throw new Error('Wallet or v1 token not available');
    }

    try {
      const selector = ethers
        .keccak256(ethers.toUtf8Bytes('stop()'))
        .slice(0, 10);
      const tx = await $wallet.sendTransaction!({
        to: v1TokenAddress,
        data: selector,
        value: 0n,
      });
      console.log('Transaction sent:', tx.hash);
    } catch (error) {
      console.error('Error calling stop():', error);
    }
  }

  $effect(() => {
    if (avatarState.profile) {
      newProfile = { ...avatarState.profile };
    }
  });

  async function saveProfile() {
    if (!newProfile) {
      return;
    }
    if (newProfile.previewImageUrl && Object.values(FallbackImageUrl).includes(newProfile.previewImageUrl as FallbackImageUrl)) {
      newProfile.previewImageUrl = '';
    }
    const cid = await saveProfileData(newProfile!);

    const tx = await runTask({
      name: 'Updating profile ...',
      promise: (async () => {
        if (!$circles?.nameRegistry) {
          throw new Error('Name registry not available');
        }
        await avatarState.avatar!.updateMetadata(cid);
      })().then(() => {
        window.location.reload();
      }),
    });
  }
</script>

<div class="page page-pt page-stack page--lg">
    <h1 class="h2">Settings</h1>
  <div
    class="flex flex-col items-center md:border rounded-lg md:px-6 md:py-8 gap-y-4"
  >
    <div class="flex flex-col w-full gap-y-4">
      <ProfileEditor
        bind:profile={newProfile}
        showCustomizableFields={avatarState.avatar?.avatarInfo?.version === 2}
      />

      {#if avatarState.avatar?.avatarInfo?.version === 2}
        <div>
          <ActionButton
            action={saveProfile}
            disabled={profilesEqual(newProfile, avatarState.profile)}
            >Save
          </ActionButton>
        </div>
      {/if}
    </div>

    {#if avatarState.isGroup}
      <div class="w-full pt-2 border-t">
        <h2 class="font-bold">Advanced Group Settings</h2>
        <GroupSetting />
      </div>
    {/if}

    {#if avatarState.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
      {#if avatarState.avatar?.avatarInfo?.version === 1}
        <div class="w-full pt-2 border-t">
          <h2 class="text-lg font-medium">Circles V2</h2>
          <div class="mt-3">
            <ActionButton action={migrateToV2}
              >Update to Circles V2
            </ActionButton>
          </div>
        </div>
      {/if}
      {#if avatarState.avatar?.avatarInfo?.v1Token && !avatarState.avatar?.avatarInfo?.v1Stopped}
        <div class="w-full pt-2 border-t">
          <h2 class="text-lg font-medium">Circles V1</h2>
          <div class="mt-3">
            <ActionButton action={stopV1}
              ><span class="text-orange-400">Stop V1 account permanently</span>
            </ActionButton>
          </div>
        </div>
      {/if}
    {/if}

    <div class="w-full pt-2 border-t">
      <h2 class="text-lg font-medium">Wallet</h2>
      <div class="mt-3">
        <ActionButton action={clearSession}>Disconnect</ActionButton>
      </div>
    </div>
  </div>
</div>
