<script lang="ts">
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import type { Avatar } from '@circles-sdk/sdk';

  async function registerHuman() {
    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }

    //TODO: why need to bind it as Avatar
    $avatar = await $circles.registerHuman() as Avatar;

    await goto('/dashboard');
  }
</script>

<div
  class="w-full flex flex-col min-h-screen max-w-xl gap-y-4 justify-center"
>
  <div class="card bg-base-100 w-96 border shadow-sm">
    <figure class="px-10 pt-10">
      <img src="/person.svg" alt="Shoes" class="w-16 h-16 rounded-xl" />
    </figure>
    <div class="card-body items-center text-center">
      <h2 class="card-title">Register person</h2>
      <div class="card-actions">
        <ActionButton action={registerHuman}>Create</ActionButton>
      </div>
    </div>
  </div>
</div>
