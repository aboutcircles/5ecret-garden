<script lang="ts">
  interface Props {
    height?: number;
  }

  let { height }: Props = $props();

  const rowStyle = $derived(height ? `min-height:${height}px;` : '');
</script>

<div aria-hidden="true" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;border:1px solid rgba(0,0,0,0.06);background:rgba(255,255,255,0.7);{rowStyle}">
  <div style="display:inline-flex;align-items:center;min-width:0;flex:1;">
    <div style="position:relative;display:inline-block;flex-shrink:0;">
      <div style="width:40px;height:40px;border-radius:9999px;background:rgba(0,0,0,0.1);"></div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-start;padding-left:16px;gap:2px;min-width:0;">
      <div style="height:16px;width:144px;max-width:100%;background:rgba(0,0,0,0.1);border-radius:4px;"></div>
      <div style="height:12px;width:112px;max-width:100%;background:rgba(0,0,0,0.08);border-radius:4px;"></div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
    <div style="text-align:right;">
      <div style="height:16px;width:80px;background:rgba(0,0,0,0.1);border-radius:4px;"></div>
      <div style="height:12px;width:96px;margin-top:4px;background:rgba(0,0,0,0.08);border-radius:4px;"></div>
    </div>
    <div style="width:24px;height:24px;border-radius:4px;background:rgba(0,0,0,0.08);"></div>
  </div>
</div>
