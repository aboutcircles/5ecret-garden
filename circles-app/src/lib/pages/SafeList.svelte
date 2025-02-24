<script lang="ts">
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';
  import { onMount } from 'svelte';
  import { ethers } from 'ethers6';
  import { wallet } from '$lib/stores/wallet';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { fetchGroupsByOwner } from '$lib/utils/groups';
  import CreateSafe from './CreateSafe.svelte';

  let safes: string[] = [];
  let groupsByAddress: Record<string, string[]>;

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

  onMount(loadSafesAndGroups);

  async function loadSafesAndGroups() {
    if (!$wallet) {
      throw new Error('Wallet address is not available');
    }

    const ownerAddress =
      $wallet instanceof SafeSdkBrowserContractRunner
        ? await $wallet.browserProvider.getSigner().then((s) => s.address)
        : $wallet.address!;

    safes = await querySafeTransactionService(ownerAddress);

    const groupFetchPromises = safes.map(async (safe) => {
      const groups = await fetchGroupsByOwner(safe);
      console.log(groups);
      groupsByAddress = { ...groupsByAddress, [safe]: groups.flat() };
    });

    await Promise.all(groupFetchPromises);
  }

  async function handleSafeCreated(event: CustomEvent) {
    console.log('handleSafeCreated triggered!', event.detail);
    const newSafeAddress = event.detail.address;
    safes = [...safes, newSafeAddress];
  }

  //
  // Connects the wallet and initializes the Circles SDK.
  //

  // bottomInfo={shortenAddress(item.toLowerCase()) +
  //       (groupsByAddress[item].length > 0
  //         ? ' - owner ' + groupsByAddress[item].length + ' groups'
  //         : '')}
</script>

{#each safes ?? [] as item (item)}
  <ConnectCircles address={item}>
    <Avatar address={item.toLowerCase()} clickable={false} view="horizontal" />
  </ConnectCircles>
{/each}
{#if (safes ?? []).length === 0}
  <div class="text-center">
    <p>No safes available.</p>
    <CreateSafe on:safecreated={handleSafeCreated} />
  </div>
{/if}
