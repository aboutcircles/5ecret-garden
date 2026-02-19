<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';

  interface Props {
    height?: number;
    showChevron?: boolean;
    dense?: boolean;
  }

  let { height, showChevron = true, dense = true }: Props = $props();
</script>

<div aria-hidden="true">
  <RowFrame noLeading={true} dense={dense}>
    <div class="w-full flex items-center justify-between">
      <div class="inline-flex items-center min-w-0 max-w-full">
        <div class="relative inline-block">
          <div class="w-10 h-10 rounded-full bg-base-300/70"></div>
        </div>
        <div class="flex flex-col items-start pl-4 gap-y-0.5 min-w-0">
          <div class="h-4 w-40 max-w-full bg-base-300/70 rounded"></div>
          <div class="h-3 w-28 max-w-full bg-base-300/60 rounded"></div>
        </div>
      </div>

      {#if showChevron}
        <div class="shrink-0">
          <div class="w-4 h-4 rounded bg-base-300/60"></div>
        </div>
      {/if}
    </div>
  </RowFrame>
</div>
