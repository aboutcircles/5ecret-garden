<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

  interface Props {
    onOpen: () => void;
    srLabel?: string;
    children?: Snippet;
  }

  let { onOpen, srLabel, children }: Props = $props();

  function focusMarketSearchInput(anchor?: HTMLElement | null): void {
    const scope = anchor?.closest<HTMLElement>('[data-market-orders-list-scope], [data-sales-orders-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-market-auth-search-input]')
      ?? document.querySelector<HTMLInputElement>('[data-market-auth-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: (anchor) => {
      const scope = anchor?.closest<HTMLElement>('[data-market-orders-list-scope], [data-sales-orders-list-scope]')
        ?? document.querySelector<HTMLElement>('[data-market-orders-list-scope], [data-sales-orders-list-scope]');
      return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-market-order-row]'));
    },
    focusInput: focusMarketSearchInput,
    onActivateRow: () => onOpen(),
  });

  function onRowKeydown(event: KeyboardEvent): void {
    listNavigator.onRowKeydown(event);
  }

  function onRowClick(event: MouseEvent): void {
    listNavigator.onRowClick(event);
    onOpen();
  }
</script>

<button
  type="button"
  data-market-order-row
  class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-base-200/40 transition-colors text-left"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <div class="flex flex-col min-w-0 mr-3">
    {@render children?.()}
  </div>
  <div class="shrink-0 flex items-center gap-2">
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
  </div>

  {#if srLabel}
    <div class="sr-only">{srLabel}</div>
  {/if}
</button>
