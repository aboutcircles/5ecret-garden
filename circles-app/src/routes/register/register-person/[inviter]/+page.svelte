<script lang="ts">
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import type { Avatar } from '@circles-sdk/sdk';
  import type { Profile } from '@circles-sdk/profiles';
  import { page } from '$app/stores';

  let profile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: undefined,
  });

  let inviter = $state($page.params.inviter) as `0x${string}`;

  async function registerHuman() {
    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }
    if (!inviter) {
      throw new Error('Inviter not set');
    }

    //TODO: why need to bind it as Avatar
    $avatar = await $circles.registerOrganizationV2(profile) as Avatar;

    await goto('/dashboard');
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
      <h2 class="card-title">Register person</h2>
      <div class="form-control">
        <label for="name" class="label">
          <span class="label-text">Inviter</span>
        </label>
        <input
          bind:value={inviter}
          type="text"
          id="name"
          class="input input-bordered w-full"
          placeholder=""
        />
      </div>
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
          action={registerHuman}
          disabled={profile.name.trim().length < 1}
        >
          Create
        </ActionButton>
      </div>
    </div>
  </div>
</div>
