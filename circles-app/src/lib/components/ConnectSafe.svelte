<script lang="ts">
  import { Sdk, type AvatarRow } from '@circles-sdk/sdk';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import { onMount } from 'svelte';
  import type { GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';

  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarRow | undefined> = $state({});
  let groupsByOwner: Record<Address, GroupRow[]> = $state({});

  interface Props {
    safeOwnerAddress: Address;
    initSdk: (ownerAddress: Address) => Promise<Sdk>;
    sdk: Sdk;
    refreshGroupsCallback?: () => void;
  }

  let { safeOwnerAddress, initSdk, sdk, refreshGroupsCallback }: Props = $props();

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
    safes = await querySafeTransactionService(safeOwnerAddress);
    safes = safes.map((safe) => safe.toLowerCase() as Address);
    const [avatarInfo, groupInfo] = await Promise.all([
      sdk?.data?.getAvatarInfoBatch(safes) ?? [],
      getBaseAndCmgGroupsByOwnerBatch(sdk, safes),
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

  // Refresh groups for all safes owned by this account
  async function refreshGroupsLocal() {
    await loadSafesAndProfile();
  }
</script>

{#each safes ?? [] as item (item)}
  <ConnectCircles
    address={item}
    isRegistered={profileBySafe[item.toLowerCase()] !== undefined}
    isV1={profileBySafe[item]?.version === 1}
    groups={groupsByOwner[item.toLowerCase() as Address] ?? []}
    initSdk={initSdk}
    refreshGroupsCallback={refreshGroupsLocal}
  />
{/each}

<div class="text-center">
  <CreateSafe {onsafecreated} />
</div>
