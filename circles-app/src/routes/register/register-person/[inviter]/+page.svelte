<script lang="ts">
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import type { Avatar } from '@circles-sdk/sdk';
  import type { Profile } from '@circles-sdk/profiles';
  import { page } from '$app/stores';

  let profile: Profile = {
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: undefined,
  };

  $: inviter = $page.params.inviter;

  async function registerHuman() {
    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }
    if (!inviter) {
      throw new Error('Inviter not set');
    }

    $avatar = <Avatar>await $circles.acceptInvitation(inviter, profile);

    await goto('/dashboard');
  }
</script>

<div
  class="w-full flex flex-col min-h-screen p-4 max-w-xl gap-y-4 justify-center"
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
