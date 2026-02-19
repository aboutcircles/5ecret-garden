<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';

  interface Props {
    height?: number;
  }

  let { height }: Props = $props();
</script>

<div aria-hidden="true">
  <RowFrame noLeading={true} clickable={false}>
    <div class="w-full flex items-center justify-between">
      <div class="inline-flex items-center min-w-0">
        <div class="relative inline-block">
          <div class="w-10 h-10 rounded-full bg-base-300/70"></div>
        </div>
        <div class="flex flex-col items-start pl-4 gap-y-0.5 min-w-0">
          <div class="h-4 w-36 max-w-full bg-base-300/70 rounded"></div>
          <div class="h-3 w-28 max-w-full bg-base-300/60 rounded"></div>
        </div>
      </div>
      <div class="flex items-center gap-3 md:gap-4 shrink-0">
        <div class="text-right">
          <div class="h-4 w-20 bg-base-300/70 rounded"></div>
          <div class="h-3 w-24 mt-1 bg-base-300/60 rounded"></div>
        </div>
        <div class="w-6 h-6 rounded bg-base-300/60"></div>
      </div>
    </div>
  </RowFrame>
</div>
