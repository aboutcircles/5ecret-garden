<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type AvatarRow, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { onMount } from 'svelte';

  export let address: string;

  let circlesConfig: CirclesConfig;
  let avatarInfo: AvatarRow | undefined;

  onMount(async () => {
    $wallet = await initializeWallet('safe', address);

    const network = await $wallet?.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    circlesConfig = await getCirclesConfig(network.chainId);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet!, circlesConfig);

    avatarInfo = await $circles.data.getAvatarInfo($wallet.address!);
  });

  async function connectWallet() {
    // If the signer address is already a registered Circles wallet, go straight to the dashboard.
    if (avatarInfo && $circles && $wallet) {
      $avatar = await $circles.getAvatar($wallet.address!);
      await goto('/dashboard');
    } else {
      await goto('/register');
    }
  }
</script>

<button
  on:click={() => connectWallet()}
  class="w-full border rounded-lg flex justify-between items-center p-4 shadow-sm hover:bg-black/5"
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
