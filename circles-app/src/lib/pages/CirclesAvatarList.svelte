<script lang="ts">
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import { wallet } from '$lib/stores/wallet';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';

  let safes = $state<string[]>([]);

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
    if (!$wallet?.address) {
      throw new Error('Wallet address is not available');
    }
    if ($wallet instanceof SafeSdkBrowserContractRunner) {
      const signer = await $wallet.browserProvider.getSigner();
      safes = await querySafeTransactionService(signer.address);
    } else {
      safes = await querySafeTransactionService($wallet.address!);
    }
  });
</script>

{#each safes ?? [] as item (item)}
  <ConnectCircles
    address={item as `0x${string}`}
    walletType="circles"
    isRegistered={true}
    chainId={100n}
  />

  <!-- <ConnectSafe {item}>
    <Avatar
      address={item.toLowerCase() as `0x${string}`}
      clickable={false}
      view="horizontal"
    >
      {shortenAddress(item.toLowerCase())} -->
  <!-- </Avatar>
  </ConnectSafe> -->
{/each}
{#if (safes ?? []).length === 0}
  <div class="text-center">
    <p>No accounts available.</p>
  </div>
{/if}
