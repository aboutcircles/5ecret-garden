<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

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
  class="market-order-row"
  style="
    width:100%;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
    box-shadow:{T.shadow.xs};
    padding:12px 14px;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    cursor:pointer;text-align:left;
    transition:transform .08s ease-out,background .15s ease-out,box-shadow .15s ease-out;
  "
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <div style="display:flex;flex-direction:column;min-width:0;flex:1;gap:2px;">
    {@render children?.()}
  </div>
  <div style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:{T.pageDeep};">
    <Icon name="chevronRight" size={11} stroke={T.inkMuted} />
  </div>

  {#if srLabel}
    <div class="sr-only">{srLabel}</div>
  {/if}
</button>

<style>
  .market-order-row:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(15,10,30,0.06), 0 1px 3px rgba(15,10,30,0.04);
  }
</style>
