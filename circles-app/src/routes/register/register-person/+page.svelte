<script lang="ts">
  import { goto } from '$app/navigation';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import { onMount } from 'svelte';

  let invitations: string[] = [];

  onMount(async () => {
    if (!$wallet?.address) {
      throw new Error('Wallet not connected');
    }
    if (!$circles?.data) {
      throw new Error('Circles SDK not initialized');
    }
    const trustRelations = $circles.data.getTrustRelations(
      $wallet.address,
      100
    );
    await trustRelations.queryNextPage();

    invitations = (trustRelations.currentPage?.results ?? [])
      .filter((o) => o.version == 2)
      .map((o) => o.truster);
  });

  function acceptInvitation(inviter: string) {
    goto('/register/register-person/' + inviter?.toLowerCase());
  }
</script>

<div class="w-full flex flex-col items-center mt-16 p-4 gap-y-4">
  {#if invitations.length > 0}
    <div class="mt-16">
      <div class="text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold">You have been invited</h1>
          {#each invitations as inviter}
            <button class="btn my-6" on:click={() => acceptInvitation(inviter)}>
              by
              <Avatar clickable={false} address={inviter} view="horizontal" />
            </button>
          {/each}
          <p class="font-semibold text-xl">
            Click on the invitation above to continue to the profile creation.
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>
