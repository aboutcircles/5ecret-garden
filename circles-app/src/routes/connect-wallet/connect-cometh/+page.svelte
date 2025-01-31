<script lang="ts">
  import { goto } from '$app/navigation';
  import { wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { avatar } from '$lib/stores/avatar';
  import { Sdk } from '@circles-sdk/sdk';
  import { gnosisConfig } from '$lib/circlesConfig';
  import { SdkContractRunnerWrapper } from '@circles-sdk/adapter-ethers';
  import { JsonRpcProvider } from 'ethers6';
  import { ComethSdkContractRunner } from '@circles-sdk/adapter-cometh';
  import { SupportedNetworks } from '@cometh/connect-sdk';
  import { onMount } from 'svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';

  const apiKey = 'dBtmwl3iT790iItpLSjeo3D06Rd4jCt7';

  async function connectCometh() {
    try {
      const localStorageAddress = window.localStorage.getItem('walletAddress');
      console.log('localStorageAddress:', localStorageAddress);

      const jsonRpcProvider = new JsonRpcProvider(gnosisConfig.circlesRpcUrl);
      const comethSdkContractRunner = new ComethSdkContractRunner(
        apiKey,
        SupportedNetworks.CHIADO,
        localStorageAddress ?? undefined
      );
      await comethSdkContractRunner.init();
      if (!comethSdkContractRunner.address) {
        throw new Error('No wallet address found');
      }
      const walletAddress = comethSdkContractRunner.address;
      const ethersContractRunner = new SdkContractRunnerWrapper(
        jsonRpcProvider,
        walletAddress,
        comethSdkContractRunner
      );
      await ethersContractRunner.init();

      window.localStorage.setItem('walletAddress', walletAddress);
      console.log('Connected wallet address:', walletAddress);

      $wallet = ethersContractRunner;

      // Initialize the Circles SDK and set it as $circles to make it globally available.
      $circles = new Sdk($wallet!, gnosisConfig);

      const avatarInfo = await $circles.data.getAvatarInfo(walletAddress);
      console.log(walletAddress);

      // If the signer address is already a registered Circles wallet, go straight to the dashboard.
      if (avatarInfo) {
        $avatar = await $circles.getAvatar(walletAddress);
        await goto('/dashboard');
      } else {
        await goto('/register');
      }
    } catch (e) {
      console.error('Error connecting to Cometh:', e);
    }
  }

  onMount(() => {
    connectCometh();
  });
</script>

<div class="w-full flex flex-col min-h-screen p-4 max-w-xl gap-y-4 mt-20">
  <WalletLoader name="Cometh" />
</div>
