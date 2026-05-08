<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { formatCurrency } from '$lib/shared/utils/money';
  import { T } from '$lib/design-system/tokens.js';

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

<div style="display:flex;flex-direction:column;gap:12px;">
  {#each reviewGroups as grp, gi (gi)}
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};">
      <!-- Seller header -->
      <div style="
        padding:8px 14px;background:{T.surfaceAlt};
        border-bottom:1px solid {T.hairlineSoft};
        display:flex;align-items:center;justify-content:space-between;gap:10px;
      ">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;flex-shrink:0;">Seller</span>
          {#if grp.seller}
            <Avatar view="small" address={grp.seller} clickable={false} />
          {:else}
            <span style="font-size:11.5px;color:{T.inkSubtle};">Unknown seller</span>
          {/if}
        </div>
      </div>

      <!-- Lines -->
      <div>
        {#each grp.indices as i, ri (i)}
          {@const unit = getLineUnitPrice(lines[i])}
          {@const total = getLineTotal(lines[i])}
          {@const qty = getLineQuantity(lines[i])}

          <div style="
            padding:12px 14px;{ri > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}
            display:grid;gap:10px;
            grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;
          ">
            <!-- image -->
            <div style="grid-row:span 2;display:flex;align-items:flex-start;">
              <div style="
                width:44px;height:44px;border-radius:10px;
                background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};overflow:hidden;
                display:inline-flex;align-items:center;justify-content:center;
                font-size:9px;color:{T.inkFaint};flex-shrink:0;
              ">
                {#if imageUrlForLine(lines[i])}
                  <img
                    src={imageUrlForLine(lines[i]) || ''}
                    alt={findCatalogItem(lines[i].seller, lines[i].orderedItem?.sku)?.product.name ?? lineTitle(lines[i])}
                    style="width:100%;height:100%;object-fit:cover;"
                  />
                {:else}
                  <span>No image</span>
                {/if}
              </div>
            </div>

            <!-- title + subtitle -->
            <div style="min-width:0;">
              <div style="font-size:13.5px;font-weight:540;color:{T.ink};line-height:1.35;">
                {findCatalogItem(lines[i].seller, lines[i].orderedItem?.sku)?.product.name ?? lineTitle(lines[i])}
              </div>
              {#if lineSubtitle(lines[i])}
                <div style="font-size:11px;color:{T.inkMuted};margin-top:2px;font-family:{T.fontMono};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{lineSubtitle(lines[i])}</div>
              {/if}
            </div>

            <!-- total -->
            <div style="text-align:right;grid-column-start:3;">
              <div style="font-size:13.5px;font-weight:580;color:{T.ink};white-space:nowrap;">
                {#if total.amount != null}{formatCurrency(total.amount, total.code)}{:else}—{/if}
              </div>
              <div style="font-size:10.5px;color:{T.inkMuted};margin-top:2px;white-space:nowrap;">
                {unit.amount != null ? `${qty} × ${formatCurrency(unit.amount, unit.code)}` : ''}
              </div>
            </div>

            <!-- quantity controls / display -->
            <div style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;gap:8px;">
              {#if editable}
                <div style="display:inline-flex;align-items:center;border:1px solid {T.hairline};border-radius:9999px;background:{T.surface};overflow:hidden;">
                  <button
                    type="button"
                    style="width:28px;height:28px;border:0;background:transparent;color:{qty <= 0 ? T.inkFaint : T.ink};cursor:{qty <= 0 ? 'not-allowed' : 'pointer'};font-size:14px;line-height:1;"
                    onclick={() => setQty(i, qty - 1)}
                    disabled={qty <= 0}
                  >−</button>
                  <span style="min-width:32px;text-align:center;font-size:12.5px;font-weight:540;color:{T.ink};border-left:1px solid {T.hairlineSoft};border-right:1px solid {T.hairlineSoft};padding:4px 0;">{qty}</span>
                  <button
                    type="button"
                    style="width:28px;height:28px;border:0;background:transparent;color:{T.ink};cursor:pointer;font-size:14px;line-height:1;"
                    onclick={() => setQty(i, qty + 1)}
                  >+</button>
                </div>

                <button
                  type="button"
                  style="
                    height:28px;padding:0 12px;border-radius:9999px;border:0;cursor:pointer;
                    background:transparent;color:{T.negative};font-size:11.5px;font-weight:540;
                  "
                  onclick={() => onRemove?.(i)}
                >Remove</button>
              {:else}
                <div style="font-size:12px;color:{T.inkBody};">
                  <span style="font-weight:580;color:{T.ink};">{qty}×</span>
                  <span style="color:{T.inkMuted};margin-left:4px;">{unit.amount != null ? formatCurrency(unit.amount, unit.code) : '—'}</span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
