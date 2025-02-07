<script lang="ts">
  import { goto } from '$app/navigation';
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { avatar } from '$lib/stores/avatar';
  import { Sdk } from '@circles-sdk/sdk';
  import { onMount } from 'svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers';

  const GNOSIS_CHAIN_ID_HEX = '0x64'; // Hexadecimal format for MetaMask request
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

    const avatarInfo = await $circles.data.getAvatarInfo($wallet.address!);

    // If the signer address is already a registered Circles wallet, go straight to the dashboard.
    if (avatarInfo) {
      $avatar = await $circles.getAvatar($wallet.address!);
      await goto('/dashboard');
    } else {
      await goto('/register');
    }
  }

  //
  // Switches to the Gnosis network if not already connected.
  //
  async function switchOrAddGnosisNetwork() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Attempt to switch to the Gnosis network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: GNOSIS_CHAIN_ID_HEX }],
        });
      } catch (switchError: any) {
        // If the network is not added yet, error code 4902 indicates adding it is necessary
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: GNOSIS_CHAIN_ID_HEX,
                  chainName: 'Gnosis',
                  rpcUrls: ['https://rpc.gnosischain.com'],
                  nativeCurrency: {
                    name: 'XDAI',
                    symbol: 'XDAI',
                    decimals: 18,
                  },
                  blockExplorerUrls: ['https://blockscout.com/poa/xdai/'],
                },
              ],
            });
          } catch (addError) {
            console.error('Failed to add the Gnosis network:', addError);
          }
        } else {
          console.error('Failed to switch to the Gnosis network:', switchError);
        }
      }
    } else {
      console.error(
        'window.ethereum is not available. Ensure MetaMask is installed.'
      );
    }
  }

  onMount(() => {
    connectWallet();
  });
</script>

<div
  class="w-full flex flex-col justify-center min-h-screen p-4 max-w-xl gap-y-4 mt-20"
>
  <WalletLoader name="Metamask" />
</div>
