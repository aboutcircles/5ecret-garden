<script lang="ts" module>
  import { get } from 'svelte/store';
  import { totalCirclesBalance } from '$lib/shared/state/totalCirclesBalance';

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
        return 'Circles';
      default:
        return tokenType;
    }
  }

  export const transitiveTransfer = () => {
    return {
      tokenOwner: TransitiveTransferTokenOwner as `0x${string}`,
      tokenType: 'TransitiveTransfer',
      circles: get(totalCirclesBalance),
      staticCircles: 0,
      crc: 0,
      tokenAddress: TransitiveTransferTokenAddress as `0x${string}`,
      tokenId: 0n,
      isWrapped: false,
      isGroup: false,
      isInflationary: false,
      staticAttoCircles: 0n,
      version: 0,
      attoCrc: 0n,
      attoCircles: 0n,
      isErc20: false,
      isErc1155: false,
    };
  };
</script>

<script lang="ts">
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import type { Readable } from 'svelte/store';
  import {
    crcTypes,
    roundToDecimals,
    shortenAddress,
    staticTypes,
  } from '$lib/shared/utils/shared';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';

  interface Props {
    balances: Readable<{
      data: TokenBalance[];
      next: () => Promise<boolean>;
      ended: boolean;
    }>;
    selectedAsset?: TokenBalance | undefined;
    showTransitive?: boolean;
    onselect: (tokenBalance: TokenBalance) => void;
  }

  let {
    balances,
    selectedAsset = $bindable(undefined),
    showTransitive = true,
    onselect,
  }: Props = $props();

  const handleSelect = (tokenBalance: TokenBalance) => {
    selectedAsset = tokenBalance;
    onselect(tokenBalance);
  };
</script>

{#if showTransitive}
  <!-- Wrap to ensure click is caught at the DOM boundary (BalanceRow doesn't emit a component 'click') -->
  <div
    role="button"
    tabindex="0"
    class="w-full"
    onclick={() => handleSelect(transitiveTransfer())}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(transitiveTransfer()); } }}
  >
    <BalanceRow item={transitiveTransfer()} />
  </div>
{/if}

<p class="menu-title pl-0 mt-4">Individual tokens</p>

{#if $balances?.data?.length > 0}
  <div class="flex flex-col p-0 w-full overflow-x-auto gap-y-2">
    {#each $balances.data as balance (balance.tokenAddress)}
      <!-- Same wrapper for reliable clicks without changing visuals -->
      <div role="button" tabindex="0" class="w-full" onclick={() => handleSelect(balance)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(balance); } }}>
        <BalanceRow item={balance} />
      </div>
    {/each}
  </div>
{:else}
  <li class="text-center py-4">You don't have any trusted assets</li>
{/if}
