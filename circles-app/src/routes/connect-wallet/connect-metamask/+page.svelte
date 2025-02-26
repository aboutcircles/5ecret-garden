<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type AvatarRow } from '@circles-sdk/sdk';
  import { onMount } from 'svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import { switchOrAddGnosisNetwork } from '$lib/utils/network';
  import { avatar } from '$lib/stores/avatar';
  import type { Network } from 'ethers';

  const GNOSIS_CHAIN_ID_DEC = 100n; // Decimal format for BrowserProvider

  let avatarInfo: AvatarRow | undefined;
  let network: Network;

  //
  // Connects the wallet and initializes the Circles SDK.
  //
  async function setup() {
    $wallet = await initializeWallet('metamask');

    if (!$wallet.address) {
      throw new Error('Failed to get wallet address');
    }

    network = await $wallet.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }

    // If we're on the wrong network, attempt to switch
    if (![GNOSIS_CHAIN_ID_DEC].includes(network.chainId)) {
      await switchOrAddGnosisNetwork();
    }

    const circlesConfig = await getCirclesConfig(network.chainId);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet!, circlesConfig);
    avatarInfo = await $circles.data.getAvatarInfo($wallet.address);
  }

  onMount(() => {
    if (!$avatar) {
      setup();
    }
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen p-4 max-w-xl gap-y-4 mt-20"
>
  <div class="w-full">
    <a href={$avatar ? '/dashboard' : '/connect-wallet'}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <h2 class="font-bold text-[28px] md:text-[32px]">Select Avatar</h2>
  <p class="font-normal text-black/60 text-base">
    Please select the avatar you want to use from the list below.
  </p>
  {#if $wallet?.address && $circles}
    <ConnectCircles
      address={$wallet.address.toLowerCase()}
      walletType="metamask"
      isRegistered={avatarInfo !== undefined}
      network={network}
    />
  {:else}
    <WalletLoader name="Metamask" />
  {/if}
</div>
