<script lang="ts">
  import { type AvatarRow } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet.svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import { onMount } from 'svelte';
  import type { WalletType } from '$lib/utils/walletType';
  import type { GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';

  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarRow | undefined> = $state({});
  let groupsByOwner: Record<Address, GroupRow[]> = $state({});

  interface Props {
    safeOwnerAddress: Address;
    chainId: bigint;
    walletType: WalletType;
  }

  let { safeOwnerAddress, chainId, walletType }: Props = $props();

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

  async function loadSafesAndProfile() {

    if (!$circles ) {
      throw new Error('Circles SDK not initialized');
    }
    safes = await querySafeTransactionService(safeOwnerAddress);
    safes = safes.map((safe) => safe.toLowerCase() as Address);
    const [avatarInfo, groupInfo] = await Promise.all([
      $circles.data.getAvatarInfoBatch(safes),
      getBaseAndCmgGroupsByOwnerBatch($circles, safes),
    ]);
    const profileBySafeNew: Record<string, AvatarRow | undefined> = {};
    avatarInfo.forEach((info) => {
      profileBySafeNew[info.avatar] = info;
    });
    profileBySafe = profileBySafeNew;
    groupsByOwner = groupInfo;
  }

  onMount(async () => {
    await loadSafesAndProfile();
  });

  async function onsafecreated(address: Address) {
    safes = [...safes, address];
  }
</script>

{#if $wallet?.address && $circles}
  {#each safes ?? [] as item (item)}
    <ConnectCircles
      address={item}
      {walletType}
      isRegistered={profileBySafe[item.toLowerCase()] !== undefined}
      isV1={profileBySafe[item]?.version === 1}
      groups={groupsByOwner[item.toLowerCase() as Address] ?? []}
      {chainId}
    />
  {/each}

  {#if walletType === 'safe'}
    <div class="text-center">
      <CreateSafe {onsafecreated} />
    </div>
  {/if}
{:else}
  <WalletLoader name="Safe" />
{/if}
