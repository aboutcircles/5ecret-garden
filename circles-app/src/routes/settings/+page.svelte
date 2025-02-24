<script lang="ts">
  import {avatar} from '$lib/stores/avatar';
  import {clearSession, wallet} from '$lib/stores/wallet';
  import {circles} from '$lib/stores/circles';
  import {goto} from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import {canMigrate} from '$lib/guards/canMigrate';
  import ProfileEditor from './editors/Profile.svelte';
  import {type Profile} from '@circles-sdk/profiles';
  import {cidV0ToUint8Array} from '@circles-sdk/utils';
  import {onMount} from 'svelte';
  import {runTask} from '$lib/utils/tasks';
  import MigrateToV2 from '$lib/flows/migrateToV2/1_GetInvited.svelte';
  import {getProfile} from '$lib/utils/profile';
  import {popupControls} from '$lib/stores/popUp';
  import {ethers} from 'ethers';

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

  async function stopV1() {
    const v1TokenAddress = $avatar?.avatarInfo?.v1Token;
    const wallet = $wallet!;
    if (!wallet || !v1TokenAddress) {
      throw new Error('Wallet or v1 token not available');
    }

    try {
      const selector = ethers.keccak256(ethers.toUtf8Bytes("stop()")).slice(0, 10);
      const tx = await wallet.sendTransaction!({
        to: v1TokenAddress,
        data: selector,
        value: 0n,
      });
      console.log("Transaction sent:", tx.hash);
    } catch (error) {
      console.error("Error calling stop():", error);
    }
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
                    >Save
                    </ActionButton
                    >
                </div>
            {/if}
        </div>

        {#if $avatar?.avatarInfo && canMigrate($avatar.avatarInfo)}
            {#if $avatar?.avatarInfo?.version === 1}
                <div class="w-full pt-2 border-t">
                    <h2 class="text-lg font-medium">Circles V2</h2>
                    <div class="mt-3">
                        <ActionButton action={migrateToV2}>Update to Circles V2</ActionButton>
                    </div>
                </div>
            {/if}
            {#if $avatar?.avatarInfo?.v1Token && !$avatar?.avatarInfo?.v1Stopped}
                <div class="w-full pt-2 border-t">
                    <h2 class="text-lg font-medium">Circles V1</h2>
                    <div class="mt-3">
                        <ActionButton action={stopV1}><span class="text-orange-400">Stop V1 account permanently</span>
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
