<script lang="ts">
  interface Props { height?: number }
  let { height = 64 }: Props = $props(); // px — match BalanceRow’s visual height
</script>

<div
  class="w-full rounded-lg bg-base-200 overflow-hidden pointer-events-none"
  style={`height:${height}px`}
  aria-hidden="true"
>
  <div class="h-full animate-pulse flex items-center gap-3 px-4">
    <div class="w-10 h-10 rounded-full bg-base-300"></div>
    <div class="flex-1 space-y-2">
      <div class="h-4 w-1/2 bg-base-300 rounded"></div>
      <div class="h-3 w-1/3 bg-base-300 rounded"></div>
    </div>
    <div class="w-16 h-4 bg-base-300 rounded"></div>
  </div>
</div>
