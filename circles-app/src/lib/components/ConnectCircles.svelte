<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { onMount } from 'svelte';
  import { fetchGroupsByOwner } from '$lib/utils/groups';
  import Avatar from './avatar/Avatar.svelte';
  import type { Network } from 'ethers';

  export let address: string;
  export let isRegistered: boolean;
  export let network: Network;
  export let walletType: 'safe' | 'metamask' = 'safe';

  let circlesConfig: CirclesConfig;
  let groups: string[] = [];

  onMount(async () => {
    groups = await fetchGroupsByOwner(address);
  });

  async function connectWallet(selectedAddress: string) {
    const lowerCaseAddress = selectedAddress.toLowerCase();

    $wallet = await initializeWallet(walletType, lowerCaseAddress);
    circlesConfig = await getCirclesConfig(network.chainId);
    $circles = new Sdk($wallet!, circlesConfig);

    if (lowerCaseAddress === address && !isRegistered) {
      await goto('/register');
      return;
    }

    if ($circles && $wallet) {
      $avatar = await $circles.getAvatar(lowerCaseAddress);
      localStorage.setItem('avatar', lowerCaseAddress);
      await goto('/dashboard');
    }
  }

  async function deployGroup() {
    if ($circles && $wallet) {
      $wallet = await initializeWallet(walletType, address);
      console.log('wallet', $wallet);
      circlesConfig = await getCirclesConfig(network.chainId);
      $circles = new Sdk($wallet!, circlesConfig);

      await goto('/register/register-group');
    }
  }
</script>

<div class="w-full border rounded-lg flex flex-col p-4 shadow-sm">
  <button
    on:click={() => connectWallet(address)}
    class="flex justify-between items-center hover:bg-black/5 rounded-lg p-2"
  >
    <Avatar
      topInfo="Personal Account"
      address={address.toLowerCase()}
      clickable={false}
      view="horizontal"
    />
    {#if !isRegistered}
      <button class="btn btn-xs btn-outline btn-primary">register</button>
    {:else}
      <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
    {/if}
  </button>
  <div class="w-full flex gap-x-2 items-center mt-6">
    <p class="font-bold text-primary">My groups</p>
    <button
      on:click={() => deployGroup()}
      class="btn btn-xs btn-ghost btn-circle"
      ><img src="/plus.svg" alt="Plus" class="w-5" /></button
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
