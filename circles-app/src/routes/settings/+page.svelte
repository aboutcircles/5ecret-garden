<script lang="ts">
  import { avatar } from '$lib/stores/avatar';
  import { wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { canMigrate } from '$lib/guards/canMigrate';
  import ProfileEditor from './editors/Profile.svelte';
  import { type Profile } from '@circles-sdk/profiles';
  import { cidV0ToUint8Array } from '@circles-sdk/utils';
  import { onMount } from 'svelte';
  import { runTask } from '$lib/utils/tasks';
  import MigrateToV2 from '$lib/flows/migrateToV2/1_GetInvited.svelte';
  import { getProfile } from '$lib/utils/profile';
  import { popupControls } from '$lib/stores/popUp';

  async function disconnect() {
    $avatar = undefined;
    $circles = undefined;
    $wallet = undefined;
    localStorage.removeItem('wallet');

    await goto('/connect-wallet');
  }

  async function saveProfileData(profile: Profile): Promise<string> {
    if (!$circles?.profiles) {
      throw new Error('Profiles not available');
    }

    return await $circles.profiles.create(profile);
  }

  let profile: Profile | undefined;

  onMount(async () => {
    profile = await getProfile($avatar?.avatarInfo?.avatar ?? '');
  });

  async function migrateToV2() {
    popupControls.open({
      title: 'Migrate to v2',
      component: MigrateToV2,
      props: {},
    })
  }

  async function saveProfile() {
    const cid = await saveProfileData(profile!);
    const digest = cidV0ToUint8Array(cid);

    const tx = await runTask({
      name: 'Updating profile ...',
      promise: (async () => {
        if (!$circles?.nameRegistry) {
          throw new Error('Name registry not available');
        }
        const tx = await $circles.nameRegistry.updateMetadataDigest(digest);
        return await tx.wait();
      })(),
    });

    if ($wallet?.address) {
      $avatar = await $circles?.getAvatar($wallet.address);
    }
  }
</script>

<div class="flex flex-col p-4 w-full max-w-2xl gap-y-4 mt-20">
  <p class="font-bold text-2xl">Settings</p>
  <div
    class="flex flex-col items-center md:border rounded-lg md:px-6 md:py-8 gap-y-4"
  >
    <div class="flex flex-col w-full gap-y-4">
      <ProfileEditor
        bind:profile
        showCustomizableFields={$avatar?.avatarInfo?.version === 2}
      />
      {#if $avatar?.avatarInfo?.version === 2}
        <div>
          <ActionButton action={saveProfile} disabled={!profile}
            >Save</ActionButton
          >
        </div>
      {/if}
    </div>

    {#if $avatar?.avatarInfo && canMigrate($avatar.avatarInfo)}
      <div class="w-full pt-2 border-t">
        <h2 class="text-lg font-medium">Circles V2</h2>
        <div class="mt-3">
          <ActionButton action={migrateToV2}>Update to Circles V2</ActionButton>
        </div>
      </div>
    {/if}

    <div class="w-full pt-2 border-t">
      <h2 class="text-lg font-medium">Wallet</h2>
      <div class="mt-3">
        <ActionButton action={disconnect}>Disconnect</ActionButton>
      </div>
    </div>
  </div>
</div>
