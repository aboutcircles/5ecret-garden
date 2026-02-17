<script lang="ts">
  interface Props {
    height?: number;
  }

  let { height }: Props = $props();

  const rowStyle = $derived(height ? `min-height: ${height}px;` : undefined);
</script>

<div
  aria-hidden="true"
  class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between text-left"
  style={rowStyle}
>
  <div class="flex flex-col min-w-0 mr-3 w-full">
    <div class="h-4 w-32 max-w-full bg-base-300/70 rounded"></div>
    <div class="text-xs flex items-center gap-2 mt-1">
      <div class="h-3 w-16 bg-base-300/60 rounded"></div>
      <div class="h-3 w-20 bg-base-300/60 rounded"></div>
    </div>
  </div>
  <div class="shrink-0 flex items-center gap-2">
    <div class="w-4 h-4 rounded bg-base-300/60"></div>
  </div>
