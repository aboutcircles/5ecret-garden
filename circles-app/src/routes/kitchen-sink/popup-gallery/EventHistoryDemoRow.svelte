<script lang="ts">
  interface Props {
    item: any;
  }

  let { item }: Props = $props();
  const row = $derived(item?.row ?? {});
</script>

<div class="px-2 py-2 border-b border-base-200 text-xs">
  <div class="font-medium">{row?.$event ?? 'Event'}</div>
  <div class="opacity-70 break-all">{row?.transactionHash ?? '0x…'}</div>
</div>
