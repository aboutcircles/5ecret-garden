<script lang="ts">
  interface DemoItem {
    id: string;
    title: string;
    subtitle: string;
    amount: string;
  }

  let { item }: { item: DemoItem } = $props();

  function focusDemoSearchInput(current: HTMLElement): void {
    const scope = current.closest<HTMLElement>('[data-demo-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-demo-list-search-input]');
    input?.focus();
  }

  function onRowKeydown(event: KeyboardEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    if (!current) return;

    const scope = current.closest<HTMLElement>('[data-demo-list-scope]');
    const rows = Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-demo-generic-row]'));
    const index = rows.indexOf(current);
    if (index === -1) return;

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();

    if (event.key === 'ArrowUp' && index === 0) {
      focusDemoSearchInput(current);
      return;
    }

    const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    rows[nextIndex]?.focus();
  }
</script>

<div
  data-demo-generic-row
  tabindex={0}
  role="button"
  aria-label={`Open ${item.title}`}
  class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  onkeydown={onRowKeydown}
>
  <div class="min-w-0">
    <div class="font-medium truncate">{item.title}</div>
    <div class="text-xs opacity-70 truncate">{item.subtitle}</div>
  </div>
  <div class="text-sm tabular-nums">{item.amount}</div>
</div>
