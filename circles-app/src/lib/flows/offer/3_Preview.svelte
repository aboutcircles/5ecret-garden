<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import type { OfferFlowContext } from './context';
  import { buildProductJson, pretty, validationErrors, parseImages } from './context';
  import { avatarState } from '$lib/stores/avatar.svelte';

  interface Props { context?: OfferFlowContext }
  let { context = $bindable({}) }: Props = $props();

  const jsonObj: any = $derived(buildProductJson(context));
  const jsonText: string = $derived(pretty(jsonObj));
  const errors = $derived(validationErrors(context));

  // Visual bits
  const images: any[] = $derived(parseImages(context.imagesInput));
  const primaryImage: string | null = $derived((() => {
    for (const it of images) {
      if (!it) continue;
      if (typeof it === 'string') return it;
      if (typeof it?.url === 'string') return it.url;
      if (typeof it?.contentUrl === 'string') return it.contentUrl;
    }
    return null;
  })());

  const sellerName: string | undefined = $derived(avatarState.profile?.name || context.sellerName);
  const sellerAddr: string | undefined = $derived(avatarState.avatar?.address?.toLowerCase());
  const sellerAvatarUrl: string = $derived(
    avatarState.profile?.previewImageUrl?.trim() ? avatarState.profile!.previewImageUrl! : '/logo.svg'
  );

  const priceLabel: string = $derived((() => {
    const p = context.price;
    const c = context.priceCurrency?.trim();
    if (p === '' || p == null || Number.isNaN(Number(p))) return '';
    return `${Number(p)}${c ? ' ' + c : ''}`;
  })());

  function copyJson() {
    navigator.clipboard?.writeText(jsonText).catch(() => {});
  }
  function downloadJson() {
    const blob = new Blob([jsonText], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (context.sku || 'product') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function shortAddr(a?: string): string {
    if (!a) return '';
    return a.slice(0, 6) + '…' + a.slice(-4);
  }
</script>

<FlowDecoration>
  <div class="space-y-4 p-1">
    <div class="font-semibold">Preview</div>

    <!-- Visual marketplace-like card -->
    <div class="bg-base-100 border border-base-300 rounded-xl overflow-hidden shadow-sm">
      {#if primaryImage}
        <img src={primaryImage} alt={context.name || 'product-image'} class="w-full h-56 object-cover" loading="lazy" />
      {:else}
        <div class="w-full h-56 bg-base-200 text-base-content/50 flex items-center justify-center text-sm">No image</div>
      {/if}

      <div class="p-4 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-lg font-semibold truncate">{context.name || '(no name yet)'}</div>
            {#if context.description}
              <div class="text-sm opacity-80 line-clamp-3">{context.description}</div>
            {/if}
            {#if context.sku}
              <div class="mt-1 text-xs opacity-60">SKU: {context.sku}</div>
            {/if}
          </div>
          {#if priceLabel}
            <div class="text-right">
              <div class="text-xl font-bold">{priceLabel}</div>
              {#if context.priceValidUntil}
                <div class="text-[11px] opacity-70">valid until {context.priceValidUntil}</div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="flex items-center gap-3 mt-1">
          <img src={sellerAvatarUrl} alt={(sellerName || sellerAddr || 'seller') + ' avatar'} class="w-10 h-10 rounded-full border object-cover" />
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{sellerName || 'Your avatar'}</div>
            <div class="text-xs opacity-70 truncate">{shortAddr(sellerAddr)}</div>
          </div>
          {#if context.availabilityFeed}
            <span class="badge badge-ghost ml-auto" title={context.availabilityFeed}>availabilityFeed</span>
          {/if}
          {#if context.inventoryFeed}
            <span class="badge badge-ghost" title={context.inventoryFeed}>inventoryFeed</span>
          {/if}
        </div>

        <div class="flex items-center justify-between gap-2 pt-2">
          <div class="text-xs opacity-60">
            {#if context.dateCreated}<span>Created {context.dateCreated}</span>{/if}
            {#if context.dateModified}
              <span>{context.dateCreated ? ' · ' : ''}Updated {context.dateModified}</span>
            {/if}
          </div>
          <div class="flex gap-2">
            {#if context.checkoutUrl}
              <a class="btn btn-primary btn-sm" href={context.checkoutUrl} target="_blank" rel="noopener">Buy</a>
            {/if}
            {#if context.productUrl}
              <a class="btn btn-outline btn-sm" href={context.productUrl} target="_blank" rel="noopener">View</a>
            {/if}
          </div>
        </div>
      </div>
    </div>

    {#if errors.length}
      <div class="alert alert-warning text-sm">
        <div>
          <div class="font-semibold">Validation warnings</div>
          <ul class="list-disc pl-5">
            {#each errors as e}<li>{e}</li>{/each}
          </ul>
        </div>
      </div>
    {/if}

    <!-- Collapsible JSON preview -->
    <details class="mt-2">
      <summary class="cursor-pointer select-none text-sm font-medium">Show JSON-LD</summary>
      <div class="mt-2">
        <textarea class="textarea textarea-bordered w-full font-mono text-xs" rows="20" readonly>{jsonText}</textarea>
        <div class="flex gap-2 mt-2">
          <button class="btn btn-primary btn-sm" onclick={copyJson}>Copy JSON</button>
          <button class="btn btn-outline btn-sm" onclick={downloadJson}>Download</button>
          <span class="text-xs opacity-60 self-center">UI only; no on-chain write yet.</span>
        </div>
      </div>
    </details>
  </div>
</FlowDecoration>
