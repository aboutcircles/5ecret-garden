<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type AvatarRow, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { onMount } from 'svelte';
  import { fetchGroupsByOwner } from '$lib/utils/groups';
  import Avatar from './avatar/Avatar.svelte';

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
      $avatar = await $circles.getAvatar(address.toLowerCase());
      localStorage.setItem('avatar', address.toLowerCase());
      await goto('/dashboard');
    } else {
      await goto('/register');
    }
  }
</script>

<div class="w-full flex flex-col border rounded-lg flex flex-col p-4 shadow-sm">
  <button
    on:click={() => connectWallet(address)}
    class="flex justify-between items-center hover:bg-black/5 rounded-lg p-2"
  >
    <slot></slot>
    {#if avatarInfo === undefined}
      <button class="btn btn-xs btn-outline btn-primary">register</button>
    {:else}
      <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
    {/if}
  </button>
  <div class="w-full flex gap-x-2 items-center mt-6">
    <p class="font-bold text-primary">My groups</p>
    <a href="/register/register-group" class="btn btn-xs btn-ghost btn-circle"
      ><img src="/plus.svg" alt="Plus" class="w-5" /></a
    >
  </div>
  <div class="w-full pl-6 flex flex-col gap-y-2 mt-2">
    {#each groups as group}
      <button
        class="flex w-full hover:bg-black/5 rounded-lg p-2"
        on:click={() => connectWallet(group)}
        ><Avatar
          address={group}
          clickable={false}
          view="horizontal"
          topInfo={group}
        /></button
      >
    {/each}
    {#if groups.length === 0}
      <p class="text-sm">No groups available.</p>
    {/if}
  </div>
</div>
