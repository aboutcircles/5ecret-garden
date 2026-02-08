<script lang="ts">
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { TrustRow as TrustRowType } from '$lib/gateway/types';

  type TrustRowItem = TrustRowType & {
    showRemove?: boolean;
    onRemove?: () => void;
  };

  interface Props {
    item: TrustRowItem;
  }

  let { item }: Props = $props();

  const expiryLabel = $derived.by(() =>
    item.expiry ? new Date(Number(item.expiry) * 1000).toLocaleString() : ''
  );

</script>

<RowFrame clickable={false} dense={true} noLeading={true}>
  <div class="w-full flex items-center justify-between gap-3">
    <div class="min-w-0 flex items-center gap-2">
      <Avatar
        address={item.trustReceiver}
        view="horizontal"
        clickable={true}
        bottomInfo={expiryLabel}
        showTypeInfo={true}
      />
    </div>

    <div class="flex items-center gap-2 text-right shrink-0">
      {#if item.showRemove}
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square text-error/80 hover:text-error"
          aria-label="Remove trust"
          onclick={(event) => {
            event.stopPropagation();
            item.onRemove?.();
          }}
        >
          <img src="/trash.svg" alt="" class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      {/if}
    </div>
  </div>
</RowFrame>
