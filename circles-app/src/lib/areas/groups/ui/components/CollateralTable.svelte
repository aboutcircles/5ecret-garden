<script lang="ts">
  import { formatUnits, parseEther } from 'ethers';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import type { TrustRelation } from '@circles-sdk/data';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import { T } from '$lib/design-system/tokens.js';

  function formatEtherTwoDecimals(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
  }

  interface Props {
    collateralInTreasury: Array<{
      avatar: Address;
      amount: bigint;
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

<div style="display:flex;flex-direction:column;gap:6px;">
  {#each collateralInTreasury as item}
    <div
      style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;"
      role="button"
      tabindex={0}
      onclick={() => openProfile(item.avatar)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') openProfile(item.avatar); }}
    >
      <div style="min-width:0;flex:1;">
        <Avatar address={item.avatar} clickable={true} view="horizontal" showTypeInfo={true} />
      </div>

      <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
        <span style="font-family:{T.fontMono};font-size:12px;font-weight:500;color:{T.ink};white-space:nowrap;">
          {formatEtherTwoDecimals(item.amount)} CRC
        </span>

        {#if redeemable}
          <input
            type="number"
            style="width:120px;padding:8px 10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontSans};font-size:12px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
            value={item.amountToRedeemInCircles}
            oninput={(e) => onRedeemInput(item, e)}
            min="0"
          />
        {/if}
      </div>
    </div>
  {/each}
</div>
