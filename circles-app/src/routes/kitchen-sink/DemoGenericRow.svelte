<script lang="ts">
  interface DemoItem {
    id: string;
    title: string;
    subtitle: string;
    amount: string;
  }

  import { T } from '$lib/design-system/tokens';

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
  style="border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;outline:none;"
  onkeydown={onRowKeydown}
>
  <div style="min-width:0;">
    <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{item.title}</div>
    <div style="font-size:11.5px;color:{T.inkMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{item.subtitle}</div>
  </div>
  <div style="font-size:13px;font-variant-numeric:tabular-nums;">{item.amount}</div>
</div>
