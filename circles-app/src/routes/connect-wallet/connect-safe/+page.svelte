<script lang="ts">
  import { onMount } from 'svelte';
  import { type AvatarRow, Sdk } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { avatar } from '$lib/stores/avatar';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';
  import { ethers, Network } from 'ethers6';
  import {goto} from "$app/navigation";

  let network: Network;
  let safes: string[] = [];
  let profileBySafe: Record<string, AvatarRow | undefined> = {};

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

  async function setup() {
    const wallet = new BrowserProviderContractRunner();
    await wallet.init();

    $wallet = wallet;

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
      const avatarInfo = await $circles.data.getAvatarInfo($wallet.address);
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

  async function handleSafeCreated(event: CustomEvent) {
    const newSafeAddress = event.detail.address;
    console.log('New safe created:', newSafeAddress);
    safes = [...safes, newSafeAddress];
  }


  let manualSafeAddress: string = localStorage.getItem('manualSafeAddress') ?? '';

  async function connectWallet(safeAddress: string) {
    $wallet = await initializeWallet('safe', safeAddress);

    const network = await $wallet?.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    var circlesConfig = await getCirclesConfig(network.chainId);

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

    localStorage.setItem('manualSafeAddress', safeAddress);
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
  <p class="font-normal text-black/60 text-base text-center">
    Please select the avatar you want to use from the list below or enter a Safe address to connect to a Safe.
  </p>
  <div class="w-full border rounded-lg flex justify-between items-center p-4 shadow-sm">
    <input type="text" placeholder="Enter safe address .." bind:value={manualSafeAddress} class="w-full"/>
    <img src="/chevron-right.svg" alt="Chevron Right" class="w-4 cursor-pointer" on:click={() => connectWallet(manualSafeAddress)}/>
  </div>

  {#if $wallet?.address && $circles}
    {#each safes ?? [] as item (item)}
      <ConnectCircles
        address={item}
        walletType="safe"
        isRegistered={profileBySafe[item] !== undefined}
        {network}
      />
    {/each}
    {#if (safes ?? []).length === 0}
      <div class="text-center">
        <p class="font-normal text-base mb-5">
          No safes available. Create new safe.
        </p>
        <CreateSafe on:safecreated={handleSafeCreated} />
      </div>
    {/if}
  {:else}
    <WalletLoader name="Safe" />
  {/if}
</div>
