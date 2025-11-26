<script lang="ts">
  interface Props {
    item: { id: string; createdAt?: string };
  }
  let { item }: Props = $props();
  const createdAtDisplay = $derived(item.createdAt ? new Date(item.createdAt).toLocaleString() : '');

  function copyId() {
    navigator.clipboard?.writeText(item.id).catch(() => {});
  }
</script>

<div class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between" role="listitem">
  <div class="flex flex-col min-w-0 mr-3">
    <div class="font-mono text-sm truncate" title={item.id}>{item.id}</div>
    {#if createdAtDisplay}
      <div class="text-xs text-base-content/70">{createdAtDisplay}</div>
    {/if}
  </div>
  <div class="flex items-center gap-2 flex-shrink-0">
    <button class="btn btn-xs btn-ghost" title="Copy order id" onclick={copyId}>Copy</button>
  </div>
  <div class="sr-only">Order id</div>
</div>
