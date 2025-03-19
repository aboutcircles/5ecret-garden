<script lang="ts">
  import { onMount } from 'svelte';
  import { type AvatarRow, Sdk } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
  import { wallet } from '$lib/stores/wallet';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { avatar } from '$lib/stores/avatar';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';
  import type { Address } from '@circles-sdk/utils';
  import { ethers, type Network } from 'ethers';

  let network: Network | undefined = $state();
  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarRow | undefined> = $state({});

  const getSafesByOwnerApiEndpoint = (checksumOwnerAddress: string): string =>
    `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;

  async function querySafeTransactionService(
    ownerAddress: string
  ): Promise<Address[]> {
    const checksumAddress = ethers.getAddress(ownerAddress);
    const requestUrl = getSafesByOwnerApiEndpoint(checksumAddress);

    const safesByOwnerResult = await fetch(requestUrl);
    const safesByOwner = await safesByOwnerResult.json();

    return safesByOwner.safes ?? [];
  }

  async function setup() {
    const walletRunner = new BrowserProviderContractRunner();
    await walletRunner.init();

    $wallet = walletRunner;

    network = await $wallet.provider?.getNetwork();

    if (!network) {
      throw new Error('Failed to get network');
    }
    const circlesConfig = await getCirclesConfig(network.chainId);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet!, circlesConfig);
  }

  async function loadSafesAndProfile() {
    if (!$wallet?.address) {
      throw new Error('Wallet address is not available');
    }

    const ownerAddress =
      $wallet instanceof SafeSdkBrowserContractRunner
        ? await $wallet.browserProvider.getSigner().then((s) => s.address)
        : $wallet.address!;

    safes = await querySafeTransactionService(ownerAddress);
    const profileFetchPromises = safes.map(async (safe) => {
      if (!$circles || !$wallet?.address) {
        throw new Error('Circles SDK or wallet not initialized');
      }
      const avatarInfo = await $circles.data.getAvatarInfo(safe);
      profileBySafe = { ...profileBySafe, [safe]: avatarInfo };
    });

    await Promise.all(profileFetchPromises);
  }

  onMount(async () => {
    if (!$avatar) {
      await setup();
    }
    loadSafesAndProfile();
  });

  async function onsafecreated(address: Address) {
    const newSafeAddress = address;
    safes = [...safes, newSafeAddress];
  }
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
  {#if $wallet?.address && $circles && network}
    {#each safes ?? [] as item (item)}
      <ConnectCircles
        address={item}
        walletType="safe"
        isRegistered={profileBySafe[item] !== undefined}
        chainId={network.chainId}
      />
    {/each}

    <div class="text-center">
      <CreateSafe {onsafecreated} />
    </div>
  {:else}
    <WalletLoader name="Safe" />
  {/if}
</div>
