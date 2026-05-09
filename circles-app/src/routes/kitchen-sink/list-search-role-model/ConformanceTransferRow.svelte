<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { Address } from '@circles-sdk/utils';

  export interface ConformanceTransferRowItem {
    id: string;
    counterpartyName: string;
    counterpartyAddress: Address;
    direction: 'in' | 'out' | 'mint' | 'burn';
    amount: number;
    timeAgo: string;
  }

  interface Props {
    item: ConformanceTransferRowItem;
  }

  import { T } from '$lib/design-system/tokens';

  let { item }: Props = $props();
  const incoming = $derived.by(() => item.direction === 'in' || item.direction === 'mint');
</script>

<RowFrame clickable={true} dense={true} noLeading={true}>
  <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;">
    <div style="min-width:0;display:flex;align-items:center;gap:8px;">
      <img src={incoming ? '/badge-received.svg' : '/badge-sent.svg'} alt="" style="width:24px;height:24px;" />
      <div style="min-width:0;">
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500;">{item.counterpartyName}</div>
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:{T.inkMuted};">{item.timeAgo} • {item.counterpartyAddress}</div>
      </div>
    </div>
    <div style="flex-shrink:0;font-size:13px;font-weight:580;color:{incoming ? T.positive : T.negative};">
      {incoming ? '+' : '-'}{item.amount.toFixed(2)} CRC
    </div>
  </div>
</RowFrame>
