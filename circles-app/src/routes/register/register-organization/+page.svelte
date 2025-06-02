<script lang="ts">
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import type { Avatar } from '@circles-sdk/sdk';
  import type { Profile } from '@circles-sdk/profiles';
  import Disclaimer from '$lib/components/Disclaimer.svelte';

  let profile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: undefined,
  });

  async function registerOrganization() {
    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }

    //TODO: why need to bind it as Avatar
    avatarState.avatar = await $circles.registerOrganizationV2(profile) as Avatar;

    await goto('/dashboard');
  }
</script>

<div
  class="w-full flex flex-col min-h-screen max-w-xl gap-y-4 justify-center"
>
  <div class="w-full">
    <button onclick={() => history.back()}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <Disclaimer />
  <div class="card bg-base-100 w-96 border shadow-xs">
    <figure class="px-10 pt-10">
      <img
        src="/organization.svg"
        alt="organization"
        class="w-16 h-16 rounded-xl"
      />
    </figure>
    <div class="card-body items-center text-center">
      <h2 class="card-title">Register organization</h2>
      <div class="form-control">
        <label for="name" class="label">
          <span class="label-text">Name</span>
        </label>
        <input
          bind:value={profile.name}
          type="text"
          id="name"
          class="input input-bordered w-full"
          placeholder=""
        />
      </div>
      <div class="card-actions">
        <ActionButton
          action={registerOrganization}
          disabled={profile.name.trim().length < 1}
        >
          Create
        </ActionButton>
      </div>
    </div>
  </div>
</div>
