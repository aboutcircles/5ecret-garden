<script lang="ts">
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { formatUnits } from 'ethers';
  import { popupControls } from '$lib/shared/state/popup';
import { ProfilePopup } from '$lib/domains/profile/ui/pages';
  import type { Address } from '@circles-sdk/utils';
  import type { TrustRelation } from '@circles-sdk/data';

  interface HolderRow {
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
    trustRelation?: TrustRelation;
  }

  interface Props {
    item: HolderRow;
  }

  let { item }: Props = $props();

  function openProfile(addr: Address): void {
    popupControls.open({ component: ProfilePopup, props: { address: addr } });
  }

  function formatAmount(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
  }
</script>

<RowFrame clickable={true} dense={true} noLeading={true} onclick={() => openProfile(item.avatar)}>
  <div class="min-w-0">
    <Avatar address={item.avatar} clickable={true} view="horizontal" showTypeInfo={true} />
  </div>
  {#snippet trailing()}<div class="text-right tabular-nums">
    <div class="font-medium">{formatAmount(item.amount)} CRC</div>
  </div>{/snippet}
</RowFrame>