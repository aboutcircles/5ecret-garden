<script lang="ts">
  import { goto } from '$app/navigation';
  import Avatar from '$lib/components/Avatar.svelte';
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import { shortenAddress } from '$lib/utils/shared';
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';
  import { Sdk, type CirclesConfig } from '@circles-sdk/sdk';

  export let safes: string[] = [];
  export let circlesConfig: CirclesConfig;
  export let contentApi: PopupContentApi;

  //
  // Connects the wallet and initializes the Circles SDK.
  //
  async function connectWallet(safeAddress: string) {
    const safeContractRunner = new SafeSdkBrowserContractRunner();
    await safeContractRunner.init(safeAddress);

    $wallet = safeContractRunner;

    const network = await safeContractRunner.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk(circlesConfig, safeContractRunner!);
    
    contentApi.close();

    const avatarInfo = await $circles.data.getAvatarInfo(
      safeContractRunner.address!
    );

    // If the signer address is already a registered Circles wallet, go straight to the dashboard.
    if (avatarInfo) {
      $avatar = await $circles.getAvatar(safeContractRunner.address!);
      await goto('/_new/dashboard');
    } else {
      await goto('/_new/register');
    }
  }
</script>

<div class="p-6">
  {#if safes.length === 0}
    <p>No safes available.</p>
  {:else}
  <!-- TODO: ADD SEARCH BAR -->
    <p class="menu-title pl-0">Found safes</p>
    {#each safes as safe}
      <button
        class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg w-full"
        on:click={() => connectWallet(safe)}
      >
        <div class="col">
          <Avatar address={safe.toLowerCase()} clickable={false}>
            {shortenAddress(safe.toLowerCase())}
          </Avatar>
        </div>
      </button>
    {/each}
  {/if}
</div>
