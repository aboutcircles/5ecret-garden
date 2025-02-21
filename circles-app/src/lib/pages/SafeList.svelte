<script lang="ts">
  import { shortenAddress } from '$lib/utils/shared';
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';
  import { onMount } from 'svelte';
  import { ethers } from 'ethers6';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';

  let safes: string[] = [];
  let groupCounts: Record<string, number> = {};

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

  async function fetchGroupsByOwner(ownerAddress: string): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'circles_query',
      params: [
        {
          Namespace: 'CrcV2',
          Table: 'CMGroupCreated',
          Columns: ['proxy'],
          Filter: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'owner',
              Value: ownerAddress.toLowerCase(),
            },
          ],
          Order: [],
          Limit: 10,
        },
      ],
    };

    const response = await fetch('https://rpc.circlesubi.network/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data.result.rows;
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
      groupCounts = { ...groupCounts, [safe]: groups.length };
    });

    await Promise.all(groupFetchPromises);
  }

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
  <ConnectCircles address={item}>
    <Avatar
      address={item.toLowerCase()}
      clickable={false}
      view="horizontal"
      bottomInfo={shortenAddress(item.toLowerCase()) +
        (groupCounts[item] > 0
          ? ' - owner ' + groupCounts[item] + ' groups'
          : '')}
    />
      </ConnectCircles>
{/each}
{#if (safes ?? []).length === 0}
  <div class="text-center">
    <p>No safes available.</p>
  </div>
{/if}
