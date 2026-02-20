<script lang="ts">
    import { formatUnits, parseEther } from 'ethers';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import type { TrustRelation } from '@circles-sdk/data';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  function formatEtherTwoDecimals(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
  }

  interface Props {
    collateralInTreasury: Array<{
      avatar: Address;
      amount: bigint; // raw wei from chain
      amountToRedeem: bigint;
      amountToRedeemInCircles: number;
      trustRelation?: TrustRelation;
    }>;
    redeemable?: boolean;
  }

  let { collateralInTreasury, redeemable = false }: Props = $props();

  function onRedeemInput(item: {
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
    trustRelation?: TrustRelation;
  }, e: Event) {
    const input = e.target as HTMLInputElement | null;
    const newValue = parseFloat(input?.value ?? '0');
    const safeValue = isNaN(newValue) ? 0 : newValue;
    item.amountToRedeemInCircles = safeValue;
    item.amountToRedeem = parseEther(safeValue.toString());
  }

    function openProfile(addr: Address): void {
        openProfilePopup(addr);
    }
</script>

<div class="w-full">
  {#each collateralInTreasury as item}
      <RowFrame clickable={true} dense={true} noLeading={true} onclick={() => openProfile(item.avatar)}>
      <div class="min-w-0">
        <Avatar
          address={item.avatar}
          clickable={true}
          view="horizontal"
          showTypeInfo={true}
        />
      </div>

      {#snippet trailing()}<div class="flex items-center gap-3 md:gap-4">
        <div class="text-right tabular-nums">
          <div class="font-medium">{formatEtherTwoDecimals(item.amount)} CRC</div>
        </div>

        {#if redeemable}
          <input
            type="number"
            class="input input-bordered w-36"
            value={item.amountToRedeemInCircles}
            oninput={(e) => onRedeemInput(item, e)}
            min="0"
          />
        {/if}
      </div>{/snippet}
    </RowFrame>
  {/each}
</div>
