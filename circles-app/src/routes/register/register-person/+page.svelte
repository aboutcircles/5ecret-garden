<script lang="ts">
  import { goto } from '$app/navigation';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import { getProfile } from '$lib/utils/profile';
  import type { AvatarRow } from '@circles-sdk/data';
  import type { Profile } from '@circles-sdk/profiles';
  import type { Address } from '@circles-sdk/utils';
  import { onMount } from 'svelte';

  interface Invitation extends AvatarRow {
    profile: Profile;
  }

  let invitations: Invitation[] = $state([]);

  onMount(async () => {
    if (!$wallet?.address) {
      throw new Error('Wallet not connected');
    }
    if (!$circles?.data) {
      throw new Error('Circles SDK not initialized');
    }

    const rawInvitations = await $circles.data.getInvitations(
      $wallet.address.toLowerCase() as Address
    );
    invitations = await Promise.all(
      rawInvitations.map(async (inviter) => {
        const profile = await getProfile(inviter.avatar);
        return { ...inviter, profile };
      })
    );
  });

  function acceptInvitation(inviter: string) {
    goto('/register/register-person/' + inviter?.toLowerCase());
  }
</script>

<div
  class="w-full flex flex-col p-4 max-w-xl gap-y-4 justify-center mt-28 md:mt-44"
>
  <div class="w-full">
    <a href="/register">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <div
    class="border rounded-lg flex flex-col items-center p-4 w-full shadow-sm"
  >
    {#if invitations.length > 0}
      <h1 class="text-3xl font-bold">You have been invited</h1>
      {#each invitations as inviter}
        <button
          class="btn my-6 max-w-64 shadow-sm"
          onclick={() => acceptInvitation(inviter.avatar)}
        >
          by
          <Avatar
            clickable={false}
            address={inviter.avatar}
            profile={inviter.profile}
            view="horizontal"
          />
        </button>
      {/each}
      <p class="font-semibold text-lg">
        Click on the invitation above to continue to the profile creation.
      </p>
    {:else}
      <p class="font-semibold text-lg">
        You need to be invited in order to register your avatar
      </p>
      TODO: add context on how to get invited
    {/if}
  </div>
</div>
