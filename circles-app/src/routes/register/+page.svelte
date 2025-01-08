<script lang="ts">
  import { onMount } from 'svelte';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import { goto } from '$app/navigation';
  import QrCode from '$lib/components/QrCode.svelte';
  import Register from '$lib/components/Register.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  let invitations: string[] = [];
  let showAdvanced: boolean = false;

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

<div
  class="w-full flex flex-col min-h-screen max-w-4xl p-4 gap-y-4 justify-center"
>
  <div class="flex flex-col">
    <p class="font-bold text-2xl">Register</p>
    <p class="text-md text-black/60">
      You're not yet signed up to Circles. Choose an avatar type that matches
      your needs.
    </p>
  </div>
  <div class="w-full flex justify-center gap-x-4">
    <Register
      imgUrl="/person.svg"
      header="Human"
      desc="As a person, you need to be invited by someone who already uses Circles"
      route="/connect-wallet/import-circles-garden"
    />
    <Register
      imgUrl="/group.svg"
      header="Group"
      desc="Create a group currency that's backed by individual personal Circles"
      route="/register/register-group"
    />
    <Register
      imgUrl="/organization.svg"
      header="Organization"
      desc="Register as an organization if you're a business"
      route="/register/register-organization"
    />
  </div>
  <div class="mt-4">
    <button
      class="font-bold text-xl"
      on:click={() => {
        showAdvanced = !showAdvanced;
      }}>Advanced</button
    >
  </div>
  <div
    class={`flex gap-x-4 overflow-hidden ${showAdvanced ? 'max-h-56' : 'max-h-0'} transition-all duration-300 ease-in-out`}
  >
    <Register
      imgUrl="/person.svg"
      header="Human (v1)"
      desc="Register at the Circles v1 Hub"
      route="/register/register-v1-person"
    />
    <Register
      imgUrl="/person.svg"
      header="Profile only"
      desc=" Create only a profile for the connected address, but no Circles account"
      route="/register/register-profile"
    />
  </div>
  <div class="w-full flex flex-col items-center">
    <p class="text-center">Share your address with Circles users</p>
    <QrCode value={$wallet?.address} />
    <p class="text-xs font-bold text-center">{$wallet?.address}</p>
  </div>
</div>

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
