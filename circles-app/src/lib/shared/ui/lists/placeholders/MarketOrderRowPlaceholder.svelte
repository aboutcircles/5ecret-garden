<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    height?: number;
  }

  let { height }: Props = $props();

  const rowStyle = $derived(height ? `min-height: ${height}px;` : undefined);
</script>

<div
  aria-hidden="true"
  style={`width:100%;background:${T.surface};border:1px solid ${T.hairlineSoft};box-shadow:${T.shadow.xs};border-radius:12px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;text-align:left;${rowStyle ?? ''}`}
>
  <div style="display:flex;flex-direction:column;min-width:0;margin-right:12px;width:100%;">
    <div style="height:16px;width:128px;max-width:100%;background:rgba(0,0,0,0.07);border-radius:4px;"></div>
    <div style="font-size:12px;display:flex;align-items:center;gap:8px;margin-top:4px;">
      <div style="height:12px;width:64px;background:rgba(0,0,0,0.06);border-radius:4px;"></div>
      <div style="height:12px;width:80px;background:rgba(0,0,0,0.06);border-radius:4px;"></div>
    </div>
  </div>
  <div style="flex-shrink:0;display:flex;align-items:center;gap:8px;">
    <div style="width:16px;height:16px;border-radius:4px;background:rgba(0,0,0,0.06);"></div>
  </div>
</div>
