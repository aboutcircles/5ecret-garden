<script lang="ts">
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
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

  let { item }: Props = $props();
  const incoming = $derived.by(() => item.direction === 'in' || item.direction === 'mint');
</script>

<RowFrame clickable={true} dense={true} noLeading={true}>
  <div class="w-full flex items-center justify-between gap-3">
    <div class="min-w-0 flex items-center gap-2">
      <img src={incoming ? '/badge-received.svg' : '/badge-sent.svg'} alt="" class="h-6 w-6" />
      <div class="min-w-0">
        <div class="truncate text-sm font-medium">{item.counterpartyName}</div>
        <div class="truncate text-xs opacity-70">{item.timeAgo} • {item.counterpartyAddress}</div>
      </div>
    </div>
    <div class={`shrink-0 text-sm font-semibold ${incoming ? 'text-success' : 'text-error'}`}>
      {incoming ? '+' : '-'}{item.amount.toFixed(2)} CRC
    </div>
  </div>
</RowFrame>
