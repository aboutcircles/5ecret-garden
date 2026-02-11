<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    onOpen: () => void;
    srLabel?: string;
    children?: Snippet;
  }

  let { onOpen, srLabel, children }: Props = $props();

  function focusMarketSearchInput(): void {
    const input = document.querySelector<HTMLInputElement>('[data-market-auth-search-input]');
    input?.focus();
  }

  function onRowKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const current = event.currentTarget as HTMLElement | null;
    if (!current) return;

    const scope = current.closest<HTMLElement>('[data-market-orders-list-scope], [data-sales-orders-list-scope]');
    const rows = Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-market-order-row]'));
    const index = rows.indexOf(current);
    if (index === -1) return;

    event.preventDefault();

    if (event.key === 'ArrowUp' && index === 0) {
      focusMarketSearchInput();
      return;
    }

    const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    rows[nextIndex]?.focus();
  }

  function onRowClick(event: MouseEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    current?.focus();
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
