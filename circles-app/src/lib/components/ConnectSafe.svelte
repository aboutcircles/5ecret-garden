<script lang="ts">
  import type { Sdk } from '@aboutcircles/sdk';
  import type { AvatarInfo, Address } from '@aboutcircles/sdk-types';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import { ethers } from 'ethers';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';

  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarInfo | undefined> = $state({});
  let groupsByOwner: Record<Address, GroupRow[]> = $state({});

  interface Props {
    safeOwnerAddress: Address;
    initSdk: (ownerAddress: Address) => Promise<Sdk>;
    sdk: Sdk;
    refreshGroupsCallback?: () => void;
  }

  let { safeOwnerAddress, initSdk, sdk, refreshGroupsCallback }: Props =
    $props();

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
    const fetchedSafes = (
      await querySafeTransactionService(safeOwnerAddress)
    ).map((safe) => safe.toLowerCase() as Address);

    // Preserve existing order to avoid list items jumping; append any new safes
    if (safes.length === 0) {
      safes = fetchedSafes;
    } else {
      const existing = new Set(safes);
      const merged = [...safes];
      for (const s of fetchedSafes) {
        if (!existing.has(s)) merged.push(s);
      }
      safes = merged;
    }

    let avatarInfoResults: AvatarInfo[];
    let groupInfo: Record<Address, GroupRow[]>;

    try {
      const rpc = (sdk as any).rpc;

      [avatarInfoResults, groupInfo] = await Promise.all([
        rpc.avatar.getAvatarInfoBatch(safes),
        getBaseAndCmgGroupsByOwnerBatch(sdk, safes),
      ]);
    } catch (error) {
      console.error('[ConnectSafe] Error fetching avatar info:', error);
      return;
    }

    const profileBySafeNew: Record<string, AvatarInfo | undefined> = {};

    // Process avatar info - only registered avatars are included (null = unregistered)
    avatarInfoResults.forEach((avatarInfo: AvatarInfo | null) => {
      if (avatarInfo && avatarInfo.avatar) {
        const safeAddress = avatarInfo.avatar.toLowerCase();
        profileBySafeNew[safeAddress] = avatarInfo;
      }
    });

    // Mark unregistered safes
    safes.forEach((safe) => {
      const safeAddress = safe.toLowerCase();
      if (!profileBySafeNew[safeAddress]) {
        profileBySafeNew[safeAddress] = undefined;
      }
    });

    profileBySafe = profileBySafeNew;
    groupsByOwner = groupInfo;
  }

  $effect(() => {
    if (!sdk || !safeOwnerAddress) return;
    loadSafesAndProfile();
  });

  async function onsafecreated(address: Address) {
    safes = [...safes, address];
  }

  async function refreshGroupsLocal() {
    await loadSafesAndProfile();
  }
</script>

{#each safes ?? [] as item (item)}
  <ConnectCircles
    address={item}
    isRegistered={profileBySafe[item.toLowerCase()] !== undefined}
    groups={groupsByOwner[item.toLowerCase() as Address] ?? []}
    {sdk}
    {initSdk}
    refreshGroupsCallback={refreshGroupsLocal}
  />
{/each}

<div class="text-center">
  <CreateSafe {onsafecreated} />
</div>
