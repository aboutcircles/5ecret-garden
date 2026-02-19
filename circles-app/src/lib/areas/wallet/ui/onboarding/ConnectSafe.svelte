<script lang="ts">
  import type { Sdk } from '@aboutcircles/sdk';
  import type { AvatarInfo, Address } from '@aboutcircles/sdk-types';
  import ConnectCircles from '$lib/areas/wallet/ui/onboarding/ConnectCircles.svelte';
  import CreateSafe from '$lib/areas/wallet/ui/pages/CreateSafe.svelte';
  import { ethers } from 'ethers';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/areas/groups/utils/getGroupsByOwnerBatch';

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

  /**
   * Query safes owned by an address via the Circles indexer RPC.
   * Replaces the deprecated Safe Transaction Service API.
   */
  async function querySafesByOwner(ownerAddress: string): Promise<Address[]> {
    const ownerLc = ownerAddress.toLowerCase();
    const result: { columns: string[]; rows: (string | number)[][] } = await (sdk as any).rpc.client.call('circles_query', [
      {
        Namespace: 'V_Safe',
        Table: 'Owners',
        Columns: ['safeAddress'],
        Filter: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'owner',
            Value: ownerLc,
          },
        ],
        Order: [],
        Limit: 1000,
      },
    ]);

    // SDK unwraps JSON-RPC result — response is { columns, rows } directly
    const columns = result.columns ?? [];
    const rows = result.rows ?? [];
    const colIdx = columns.findIndex((c) => c.toLowerCase() === 'safeaddress');
    const safesRaw: string[] = (
      colIdx >= 0
        ? rows.map((r) => String(r[colIdx]))
        : rows.map((r) => String(r[0]))
    ).filter(Boolean);

    // Normalize and deduplicate
    return Array.from(
      new Set(safesRaw.map((s) => ethers.getAddress(s).toLowerCase() as Address))
    );
  }

  async function loadSafesAndProfile() {
    let fetchedSafes: Address[];
    try {
      fetchedSafes = await querySafesByOwner(safeOwnerAddress);
    } catch (err) {
      console.error('[ConnectSafe] Failed to query safes:', err);
      return;
    }

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
