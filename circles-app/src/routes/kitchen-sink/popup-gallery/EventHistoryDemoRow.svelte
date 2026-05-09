<script lang="ts">
  interface Props {
    item: any;
  }

  import { T } from '$lib/design-system/tokens';

  let { item }: Props = $props();
  const row = $derived(item?.row ?? {});
</script>

<div style="padding:8px;border-bottom:1px solid {T.hairlineSoft};font-size:11.5px;">
  <div style="font-weight:500;">{row?.$event ?? 'Event'}</div>
  <div style="color:{T.inkMuted};word-break:break-all;">{row?.transactionHash ?? '0x…'}</div>
</div>
