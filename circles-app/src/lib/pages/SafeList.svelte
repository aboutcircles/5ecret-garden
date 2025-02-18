<script lang="ts">
  import { shortenAddress } from '$lib/utils/shared';
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';
  import { onMount } from 'svelte';
  import { ethers } from 'ethers6';
  import { wallet } from '$lib/stores/wallet';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

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
    if (!$wallet) {
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
</script>

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
