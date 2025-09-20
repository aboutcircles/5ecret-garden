<script lang="ts" module>
  import { get } from 'svelte/store';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';

  export const TransitiveTransferTokenOwner =
    '0x0000000000000000000000000000000000000001';
  export const TransitiveTransferTokenAddress =
    '0x0000000000000000000000000000000000000002';

  export function tokenTypeToString(tokenType: string) {
    if (!tokenType) {
      // "CrcV1_HubTransfer";
      return 'Transitive Transfer (v1)';
    }
    switch (tokenType) {
      case 'CrcV2_RegisterHuman':
        return 'Personal Circles';
      case 'CrcV1_Signup':
        return 'Personal Circles (v1)';
      case 'CrcV2_ERC20WrapperDeployed_Demurraged':
        return 'ERC20 Wrapper (Demurraged)';
      case 'CrcV2_ERC20WrapperDeployed_Inflationary':
        return 'ERC20 Wrapper (Inflationary)';
      case 'CrcV2_RegisterGroup':
        return 'Group Circles';
      case 'TransitiveTransfer':
        return 'Circles along a trust path';
      default:
        return tokenType;
    }
  }

  export const transitiveTransfer = () => {
    return {
      tokenOwner: TransitiveTransferTokenOwner,
      tokenType: 'TransitiveTransfer',
      circles: get(totalCirclesBalance),
      staticCircles: 0,
      crc: 0,
      tokenAddress: TransitiveTransferTokenAddress,
      tokenId: '0',
      isWrapped: false,
      isGroup: false,
      isInflationary: false,
      staticAttoCircles: '0',
      version: 0,
      attoCrc: '0',
      attoCircles: '0',
      isErc20: false,
      isErc1155: false,
    };
  };
</script>

<script lang="ts">
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import type { Readable } from 'svelte/store';
  import {
    crcTypes,
    roundToDecimals,
    shortenAddress,
    staticTypes,
  } from '$lib/utils/shared';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  interface Props {
    balances: Readable<{
    data: TokenBalanceRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>;
    selectedAsset?: TokenBalanceRow | undefined;
    showTransitive?: boolean;
    onselect: (tokenBalanceRow: TokenBalanceRow) => void;
  }

  let { balances, selectedAsset = $bindable(undefined), showTransitive = true, onselect }: Props = $props();

  const handleSelect = (tokenBalanceRow: TokenBalanceRow) => {
    selectedAsset = tokenBalanceRow;
    onselect(tokenBalanceRow);
  };
</script>

{#if showTransitive}
  <BalanceRow item={transitiveTransfer()} on:click={() => handleSelect(transitiveTransfer())} />
{/if}

<p class="menu-title pl-0 mt-4">Individual tokens</p>

{#if $balances?.data?.length > 0}
  <div class="flex flex-col p-0 w-full overflow-x-auto gap-y-2">
    {#each $balances.data as balance (balance.tokenAddress)}
      <BalanceRow item={balance} on:click={() => handleSelect(balance)} />
    {/each}
  </div>
{:else}
  <li class="text-center py-4">You don't have any trusted assets</li>
{/if}
