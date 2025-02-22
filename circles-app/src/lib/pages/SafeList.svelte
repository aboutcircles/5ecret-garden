<script lang="ts">
  import {shortenAddress} from '$lib/utils/shared';
  import {SafeSdkBrowserContractRunner} from '@circles-sdk/adapter-safe';
  import {onMount} from 'svelte';
  import {ethers} from 'ethers6';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';

  let safes: string[] = [];

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

  onMount(async () => {
    if (!$wallet.address) {
      throw new Error('Wallet address is not available');
    }
    if ($wallet instanceof SafeSdkBrowserContractRunner) {
      const signer = await $wallet.browserProvider.getSigner();
      safes = await querySafeTransactionService(signer.address);
    } else {
      safes = await querySafeTransactionService($wallet.address!);
    }
  });

  //
  // Connects the wallet and initializes the Circles SDK.
  //

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


<div class="w-full border rounded-lg flex justify-between items-center p-4 shadow-sm">
  <input type="text" placeholder="Enter safe address .." bind:value={manualSafeAddress} class="w-full"/>
  <img src="/chevron-right.svg" alt="Chevron Right" class="w-4 cursor-pointer" on:click={() => connectWallet(manualSafeAddress)}/>
</div>
{#each safes ?? [] as item (item)}
  <ConnectSafe {item}>
    <Avatar address={item.toLowerCase()} clickable={false} view="horizontal">
      {shortenAddress(item.toLowerCase())}
    </Avatar>
  </ConnectSafe>
{/each}
{#if (safes ?? []).length === 0}
  <div class="text-center">
    <p>No safes available.</p>
  </div>
{/if}
