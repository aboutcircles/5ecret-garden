<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { Address } from '@aboutcircles/sdk-types';

  export interface ConformanceBalanceRowItem {
    id: string;
    ownerName: string;
    ownerAddress: Address;
    tokenType: 'CRC' | 'Static Circles' | 'Wrapped CRC';
    circles: number;
    secondaryAmount?: number;
  }

  interface Props {
    item: ConformanceBalanceRowItem;
  }

  let { item }: Props = $props();
</script>

<RowFrame noLeading={true} clickable={true} dense={true}>
  <div class="w-full flex items-center justify-between gap-3">
    <div class="min-w-0 flex items-center gap-2">
      <img src={item.tokenType === 'Wrapped CRC' ? '/wrapped.svg' : '/circles-token.svg'} alt="" class="h-6 w-6" />
      <div class="min-w-0">
        <div class="truncate text-sm font-medium">{item.ownerName}</div>
        <div class="truncate text-xs opacity-70">{item.tokenType} • {item.ownerAddress}</div>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <div class="text-right">
        <div class="text-sm font-semibold">{item.circles.toFixed(2)} CRC</div>
        {#if item.secondaryAmount != null}
          <div class="text-xs opacity-70">{item.secondaryAmount.toFixed(2)} secondary</div>
        {/if}
      </div>
      <button type="button" class="btn btn-ghost btn-xs" aria-label="Row actions">
        <img src="/union.svg" alt="" class="h-4 w-4" />
      </button>
    </div>
  </div>
</RowFrame>
