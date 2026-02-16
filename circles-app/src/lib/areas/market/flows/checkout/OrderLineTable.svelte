<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { formatCurrency } from '$lib/shared/utils/money';

  interface UnitPrice {
    amount: number | null;
    code: string | null;
  }

  interface Props {
    lines: any[];
    findCatalogItem: (seller: string | undefined, sku: string | undefined) => any | undefined;
    imageUrlForLine: (line: any) => string | null;
    getLineQuantity: (line: any) => number;
    getLineUnitPrice: (line: any) => UnitPrice;
    getLineTotal: (line: any) => UnitPrice;
    editable?: boolean;
    onQuantityChange?: (index: number, value: string) => void;
    onRemove?: (index: number) => void;
  }

  let {
    lines,
    findCatalogItem,
    imageUrlForLine,
    getLineQuantity,
    getLineUnitPrice,
    getLineTotal,
    editable = false,
    onQuantityChange,
    onRemove,
  }: Props = $props();

  type ReviewGroup = { seller: string | null; indices: number[] };
  const reviewGroups: ReviewGroup[] = $derived((() => {
    const map = new Map<string, number[]>();
    (lines ?? []).forEach((_, idx) => {
      const seller = (lines[idx]?.seller as string | undefined) ?? null;
      const key = seller || '__unknown__';
      const arr = map.get(key) ?? [];
      arr.push(idx);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([key, idxs]) => ({
      seller: key === '__unknown__' ? null : (key as string),
      indices: idxs,
    }));
  })());

  function lineTitle(line: any): string {
    const name = line?.orderedItem?.name;
    const sku = line?.orderedItem?.sku;
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
    if (typeof sku === 'string' && sku.trim().length > 0) {
      return sku.trim();
    }
    return 'Item';
  }

  function lineSubtitle(line: any): string | null {
    const sku = line?.orderedItem?.sku;
    const parts: string[] = [];
    if (typeof sku === 'string' && sku.trim().length > 0) {
      parts.push(`SKU: ${sku.trim()}`);
    }
    return parts.length ? parts.join(' • ') : null;
  }

  function setQty(idx: number, next: number): void {
    onQuantityChange?.(idx, String(Math.max(0, next)));
  }
</script>

<div class="flex flex-col gap-4">
  {#each reviewGroups as grp, gi (gi)}
    <div class="border border-base-300/60 rounded-lg">
      <div class="px-3 py-2 bg-base-200/40 flex items-center justify-between text-xs text-base-content/60">
        <div class="flex items-center gap-2">
          <span class="uppercase tracking-wide">Seller</span>
          {#if grp.seller}
            <Avatar view="small" address={grp.seller} clickable={false} />
          {:else}
            <span class="opacity-60">Unknown seller</span>
          {/if}
        </div>
      </div>

      <div class="divide-y divide-base-200">
        {#each grp.indices as i}
          {@const unit = getLineUnitPrice(lines[i])}
          {@const total = getLineTotal(lines[i])}
          {@const qty = getLineQuantity(lines[i])}

          <div
            class="px-3 py-3 md:px-4 md:py-4 grid gap-2 md:gap-3
                   grid-cols-[auto,1fr,auto]
                   grid-rows-[auto,auto]"
          >
            <!-- image (mobile + desktop) -->
            <div class="row-span-2 flex items-start">
              <div class="w-8 h-8 md:w-10 md:h-10 rounded bg-base-200 overflow-hidden flex items-center justify-center text-[10px] text-base-content/50">
                {#if imageUrlForLine(lines[i])}
                  <img
                    src={imageUrlForLine(lines[i]) || ''}
                    alt={findCatalogItem(lines[i].seller, lines[i].orderedItem?.sku)?.product.name ?? lineTitle(lines[i])}
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <span>No image</span>
                {/if}
              </div>
            </div>

            <!-- title + subtitle -->
            <div class="min-w-0">
              <div class="text-sm md:text-base font-medium truncate md:whitespace-normal">
                {findCatalogItem(lines[i].seller, lines[i].orderedItem?.sku)?.product.name ?? lineTitle(lines[i])}
              </div>
              {#if lineSubtitle(lines[i])}
                <div class="text-xs opacity-60 truncate md:whitespace-normal">{lineSubtitle(lines[i])}</div>
              {/if}
            </div>

            <!-- total (mobile: top-right, desktop: right column) -->
            <div class="text-right col-start-3">
              <div class="text-sm font-semibold">
                {#if total.amount != null}
                  {formatCurrency(total.amount, total.code)}
                {:else}
                  —
                {/if}
              </div>
              <div class="text-xs opacity-60 hidden md:block">
                {unit.amount != null ? `à ${formatCurrency(unit.amount, unit.code)}` : ''}
              </div>
              <div class="text-xs opacity-60 md:hidden">
                {unit.amount != null ? `${qty} × ${formatCurrency(unit.amount, unit.code)}` : ''}
              </div>
            </div>

            <!-- quantity controls + mobile remove -->
            <div class="col-span-2 flex items-center justify-between gap-2">
              {#if editable}
                <div class="join">
                  <button
                    type="button"
                    class="btn btn-xs md:btn-sm join-item"
                    onclick={() => setQty(i, qty - 1)}
                    disabled={qty <= 0}
                  >
                    -
                  </button>
                  <div class="btn btn-xs md:btn-sm join-item pointer-events-none min-w-10">{qty}</div>
                  <button
                    type="button"
                    class="btn btn-xs md:btn-sm join-item"
                    onclick={() => setQty(i, qty + 1)}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  class="btn btn-ghost btn-xs md:btn-sm text-error"
                  onclick={() => onRemove?.(i)}
                >
                  Remove
                </button>
              {:else}
                <div class="text-sm md:text-right">
                  <span class="font-semibold">{qty}x</span>
                  <span class="text-xs opacity-60 ml-1">
                    {unit.amount != null ? formatCurrency(unit.amount, unit.code) : '—'}
                  </span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
