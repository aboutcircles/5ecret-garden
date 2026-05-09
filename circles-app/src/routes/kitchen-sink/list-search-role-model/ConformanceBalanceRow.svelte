<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { T } from '$lib/design-system/tokens';

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
  <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;">
    <div style="min-width:0;display:flex;align-items:center;gap:8px;">
      <img src={item.tokenType === 'Wrapped CRC' ? '/wrapped.svg' : '/circles-token.svg'} alt="" style="width:24px;height:24px;" />
      <div style="min-width:0;">
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500;">{item.ownerName}</div>
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:{T.inkMuted};">{item.tokenType} • {item.ownerAddress}</div>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:580;">{item.circles.toFixed(2)} CRC</div>
        {#if item.secondaryAmount != null}
          <div style="font-size:11.5px;color:{T.inkMuted};">{item.secondaryAmount.toFixed(2)} secondary</div>
        {/if}
      </div>
      <button type="button" style="height:26px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:11.5px;font-weight:540;cursor:pointer;" aria-label="Row actions">
        <img src="/union.svg" alt="" style="width:16px;height:16px;" />
      </button>
    </div>
  </div>
</RowFrame>
