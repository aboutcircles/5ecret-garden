<script lang="ts">

  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type AvatarRow, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { onMount } from 'svelte';
  import { fetchGroupsByOwner } from '$lib/utils/groups';

  export let address: string;
  export let walletType: 'safe' | 'metamask' = 'safe';

  let circlesConfig: CirclesConfig;
  let avatarInfo: AvatarRow | undefined;
  let groups: string[] = [];

  onMount(async () => {
    $wallet = await initializeWallet(walletType, address);

    if (!$wallet.address) {
      throw new Error('Failed to get wallet address');
    }

    const network = await $wallet?.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    circlesConfig = await getCirclesConfig(network.chainId);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet!, circlesConfig);

    avatarInfo = await $circles.data.getAvatarInfo($wallet.address);
    if (avatarInfo) {
      groups = await fetchGroupsByOwner($wallet.address);
      console.log(groups);
    }
  });

  async function connectWallet(address: string) {
    // If the signer address is already a registered Circles wallet, go straight to the dashboard.
    if (avatarInfo && $circles && $wallet) {
      console.log('avatarInfo', avatarInfo, address);
      $avatar = await $circles.getAvatar(address.toLowerCase());
      await goto('/dashboard');
    } else {
      await goto('/register');
    }
  }
</script>

<div
  class="w-full flex flex-col gap-y-2 border rounded-lg flex flex-col p-4 shadow-sm"
>
  <button
    on:click={() => connectWallet(address)}
    class="flex justify-between items-center hover:bg-black/5 p-2"
  >
    <div class="flex items-center gap-x-4">
      <slot></slot>
    </div>
    {#if avatarInfo === undefined}
      <button class="btn btn-xs btn-outline btn-primary">register</button>
    {:else}
      <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
    {/if}
  </button>
  <div class="w-full flex gap-x-2">
    <p class="font-bold text-primary">My groups</p>
    <a
      href="/register/register-group"
      class="btn btn-xs btn-outline btn-primary btn-circle"
      ><img src="/plus.svg" alt="Plus" class="w-3" /></a
    >
  </div>
  <div class="pl-4">
    {#each groups as group}
      <div class="flex items">
        <button class="text-sm" on:click={() => connectWallet(group)}
          >{group}</button
        >
      </div>
    {/each}
    {#if groups.length === 0}
      <p class="text-sm">No groups available.</p>
    {/if}
  </div>
