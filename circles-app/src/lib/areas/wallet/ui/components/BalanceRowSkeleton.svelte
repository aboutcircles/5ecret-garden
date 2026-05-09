<script lang="ts">
  interface Props { height?: number }
  let { height = 64 }: Props = $props(); // px — match BalanceRow’s visual height
</script>

<div
  style="width:100%;border-radius:8px;background:rgba(0,0,0,0.06);overflow:hidden;pointer-events:none;height:{height}px;"
  aria-hidden="true"
>
  <div class="brs-pulse" style="height:100%;display:flex;align-items:center;gap:12px;padding:0 16px;">
    <div style="width:40px;height:40px;border-radius:9999px;background:rgba(0,0,0,0.1);flex-shrink:0;"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
      <div style="height:16px;width:50%;background:rgba(0,0,0,0.1);border-radius:4px;"></div>
      <div style="height:12px;width:33%;background:rgba(0,0,0,0.08);border-radius:4px;"></div>
    </div>
    <div style="width:64px;height:16px;background:rgba(0,0,0,0.1);border-radius:4px;flex-shrink:0;"></div>
  </div>
</div>

<style>
  @keyframes brs-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  .brs-pulse { animation: brs-pulse 1.5s ease-in-out infinite; }
</style>
