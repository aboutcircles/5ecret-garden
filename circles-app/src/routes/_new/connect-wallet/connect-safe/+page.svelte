<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers6';
  import { type CirclesConfig, Sdk } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
  import { popupControls } from '$lib/components/PopUp.svelte';
  import { chiadoConfig, gnosisConfig } from '$lib/chiadoConfig';
  import SafeList from '$lib/pages/SafeList.svelte';

  export async function getCirclesConfig(chainId: bigint): Promise<CirclesConfig> {
    switch (chainId) {
      case 100n:
        return gnosisConfig;
      case 10200n:
        return chiadoConfig;
      default:
        throw new Error(`Unsupported chain-id: ${chainId}`);
    }
  }

  const getSafesByOwnerApiEndpoint = (checksumOwnerAddress: string): string =>
    `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;

  async function querySafeTransactionService(
    ownerAddress: string
  ): Promise<string[]> {
    const checksumAddress = ethers.getAddress(ownerAddress);
    const requestUrl = getSafesByOwnerApiEndpoint(checksumAddress);

    const safesByOwnerResult = await fetch(requestUrl);
    const safesByOwner = await safesByOwnerResult.json();

    return safesByOwner.safes ?? [];
  }

  let safes: string[] | undefined = undefined;
  let circlesConfig: CirclesConfig | undefined = undefined

  onMount(async () => {
    const wallet = new BrowserProviderContractRunner();
    await wallet.init();

    $wallet = wallet;

    const network = await $wallet.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    circlesConfig = await getCirclesConfig(network.chainId);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk(circlesConfig, $wallet!);

    safes = await querySafeTransactionService($wallet.address!);
  });

  $: if (safes) {
    console.log(safes)
    $popupControls.open?.({
      component: SafeList,
      title: "Your Safes",
      props: {
        safes: safes,
        circlesConfig: circlesConfig
      }
    });
  }
</script>

<div class="hero bg-base-200 min-h-screen">
  <div class="hero-content flex-col lg:flex-row-reverse">
    <div class="card bg-base-100 w-96 shadow-xl">
      {#if !safes}
        <figure class="px-10 pt-10">
          <span class="loading loading-spinner loading-lg"></span>
        </figure>
        <div class="card-body items-center text-center">
          <h2 class="card-title">Connecting your MetaMask wallet ...</h2>
          <p>Please wait while we're loading your safes</p>
          <a href="/_new/connect-wallet" class="btn btn-warning">Cancel</a>
        </div>
      <!-- {:else}
        {#each safes as safe}
          <button
            class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
            on:click={() => connectWallet(safe)}
          >
            <div class="col">
              <Avatar address={safe.toLowerCase()} clickable={false}>
                {shortenAddress(safe.toLowerCase())}
              </Avatar>
            </div>
          </button>
        {/each} -->
      {/if}
    </div>
  </div>
</div>
