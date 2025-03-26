<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';

  interface Props {
    item: string;
    children?: any;
  }

  const { item, children }: Props = $props();

  let circlesConfig: CirclesConfig;

  async function connectWallet(safeAddress: string) {
    $wallet = await initializeWallet('circles', safeAddress as `0x${string}`);

    const network = await $wallet?.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    circlesConfig = await getCirclesConfig(network.chainId);

    console.log('connectSafe', $wallet, $circles);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet! as any, circlesConfig);

    const avatarInfo = await $circles.data.getAvatarInfo($wallet.address!);

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
  onclick={() => connectWallet(item)}
  class="w-full border rounded-lg flex justify-between items-center p-4 shadow-sm hover:bg-black/5"
>
  <div class="flex items-center gap-x-4">
    {@render children?.()}
  </div>
  <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
</button>
