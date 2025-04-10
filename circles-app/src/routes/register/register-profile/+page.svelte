<script lang="ts">
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import type { Profile } from '@circles-sdk/profiles';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import { onMount } from 'svelte';

  let profile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: undefined,
  });

  onMount(async () => {
    if ($wallet?.address) {
      const profileCid = await $circles?.data?.getMetadataCidForAddress(
        $wallet.address
      );
      profile = profileCid
        ? ((await $circles?.profiles?.get(profileCid)) ?? profile)
        : profile;
    }
  });

  async function registerProfile() {
    await $circles?.createOrUpdateProfile(profile);
  }
</script>

<div
  class="w-full flex flex-col min-h-screen max-w-xl gap-y-4 justify-center"
>
  <div class="card bg-base-100 w-96 border shadow-sm">
    <figure class="px-10 pt-10">
      <img src="/person.svg" alt="person" class="w-16 h-16 rounded-xl" />
    </figure>
    <div class="card-body items-center text-center">
      <h2 class="card-title">Register profile</h2>
      <ProfileEditor bind:profile />
      <div class="card-actions">
        <ActionButton
          action={registerProfile}
          disabled={profile.name.trim().length < 1}
        >
          Create
        </ActionButton>
      </div>
    </div>
  </div>
</div>
