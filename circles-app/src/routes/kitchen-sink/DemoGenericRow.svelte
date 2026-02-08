<script lang="ts">
  interface DemoItem {
    id: string;
    title: string;
    subtitle: string;
    amount: string;
  }

  let { item }: { item: DemoItem } = $props();
</script>

<div class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-3">
  <div class="min-w-0">
    <div class="font-medium truncate">{item.title}</div>
    <div class="text-xs opacity-70 truncate">{item.subtitle}</div>
  </div>
  <div class="text-sm tabular-nums">{item.amount}</div>
</div>
