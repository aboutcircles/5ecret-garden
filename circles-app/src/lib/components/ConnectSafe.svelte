<script lang="ts">
  import { chiadoConfig, gnosisConfig } from '$lib/chiadoConfig';
  import {
    SafeSdkBrowserContractRunner,
    SafeSdkPrivateKeyContractRunner,
  } from '@circles-sdk/adapter-safe';
  import { wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { initializeWallet } from '$lib/utils/wallet';

  export let item: string;

  let circlesConfig: CirclesConfig;

  async function getCirclesConfig(chainId: bigint): Promise<CirclesConfig> {
    switch (chainId) {
      case 100n:
        return gnosisConfig;
      case 10200n:
        return chiadoConfig;
      default:
        throw new Error(`Unsupported chain-id: ${chainId}`);
    }
  }

  async function connectWallet(safeAddress: string) {

    $wallet = await initializeWallet('safe', safeAddress);

    const network = await $wallet?.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    circlesConfig = await getCirclesConfig(network.chainId);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet!, circlesConfig);

    const avatarInfo = await $circles.data.getAvatarInfo(
      $wallet.address!
    );

    // If the signer address is already a registered Circles wallet, go straight to the dashboard.
    if (avatarInfo) {
      $avatar = await $circles.getAvatar($wallet.address!);
      await goto('/dashboard');
    } else {
      await goto('/register');
    }
  }
</script>

<button
  on:click={() => connectWallet(item)}
  class="w-full border rounded-lg flex justify-between items-center p-4 shadow-sm hover:bg-black/5"
>
  <div class="flex items-center gap-x-4">
    <slot></slot>
  </div>
  <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
</button>
