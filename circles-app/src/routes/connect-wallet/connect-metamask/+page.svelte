<script lang="ts">
  import { goto } from '$app/navigation';
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { avatar } from '$lib/stores/avatar';
  import { Sdk, type AvatarRow } from '@circles-sdk/sdk';
  import { onMount } from 'svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { switchOrAddGnosisNetwork } from '$lib/utils/network';

  const GNOSIS_CHAIN_ID_DEC = 100n; // Decimal format for BrowserProvider

  //
  // Connects the wallet and initializes the Circles SDK.
  //
  async function connectWallet() {
    localStorage.removeItem('usePK');
    localStorage.setItem('useMM', 'true');

    $wallet = await initializeWallet('metamask');

    const network = await $wallet.provider?.getNetwork();
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
  }

  onMount(connectWallet);
</script>

<div
  class="w-full flex flex-col justify-center min-h-screen p-4 max-w-xl gap-y-4 mt-20"
>
  {#if $wallet?.address}
    <ConnectCircles address={$wallet.address} walletType="metamask">
      <Avatar
        address={$wallet.address.toLowerCase()}
        clickable={false}
        view="horizontal"
      />
    </ConnectCircles>
  {:else}
    <WalletLoader name="Metamask" />
  {/if}
</div>
