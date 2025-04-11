<script lang="ts">
  import { type AvatarRow } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import { onMount } from 'svelte';
  import type { WalletType } from '$lib/utils/walletType';
  import { getCmGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';
  import type { CoreMembersGroupRow } from '@circles-sdk/data/dist/rows/coreMembersGroupRow';

  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarRow | undefined> = $state({});
  let groupsByOwner: Record<Address, CoreMembersGroupRow[]> = $state({});

  interface Props {
    safeOwnerAddress?: Address;
    chainId: bigint;
    walletType: WalletType;
  }

  let { safeOwnerAddress, chainId, walletType }: Props = $props();

  const getSafesByOwnerApiEndpoint = (checksumOwnerAddress: string): string =>
    `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;

  async function querySafeTransactionService(
    ownerAddress: string,
  ): Promise<Address[]> {
    const checksumAddress = ethers.getAddress(ownerAddress);
    const requestUrl = getSafesByOwnerApiEndpoint(checksumAddress);

    const safesByOwnerResult = await fetch(requestUrl);
    const safesByOwner = await safesByOwnerResult.json();

    return safesByOwner.safes ?? [];
  }

  async function loadSafesAndProfile() {
    if (!safeOwnerAddress) {
      throw new Error('Safe owner address is not provided');
    }

    if (!$wallet?.address) {
      throw new Error('Wallet address is not available');
    }

    if (!$circles || !$wallet?.address) {
      throw new Error('Circles SDK or wallet not initialized');
    }
    safes = await querySafeTransactionService(safeOwnerAddress);
    const [avatarInfo, groupInfo] = await Promise.all([
      $circles.data.getAvatarInfoBatch(safes),
      getCmGroupsByOwnerBatch($circles, safes),
    ]);
    const profileBySafeNew: Record<string, AvatarRow | undefined> = {};
    avatarInfo.forEach((info) => {
      profileBySafeNew[ethers.getAddress(info.avatar)] = info;
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

<div
  class="w-full flex flex-col items-center min-h-screen max-w-xl gap-y-4 mt-20"
>
  <div class="w-full">
    <button onclick="{() => history.back()}">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <h2 class="font-bold text-[28px] md:text-[32px]">Select Avatar</h2>
  <p class="font-normal text-black/60 text-base">
    Please select the avatar you want to use from the list below.
  </p>
  {#if $wallet?.address && $circles}
    {#each safes ?? [] as item (item)}
      <ConnectCircles
        address={item}
        walletType={walletType}
        isRegistered={profileBySafe[item] !== undefined}
        isV1={profileBySafe[item]?.version === 1}
        groups={groupsByOwner[item.toLowerCase() as Address] ?? []}
        chainId={chainId}
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
</div>
