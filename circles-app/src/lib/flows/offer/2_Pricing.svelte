<script lang="ts">
  import { popupControls } from '$lib/stores/popUp';
  import OfferStep3 from './3_PreviewPublish.svelte';
  import type { OfferFlowContext } from './types';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  let price          = $state(context.draft?.price ?? 0);
  let priceCurrency  = $state(context.draft?.priceCurrency ?? 'EUR');
  let checkout       = $state(context.draft?.checkout ?? '');
  let availability   = $state(context.draft?.availability ?? '');
  let availabilityFeed = $state(context.draft?.availabilityFeed ?? '');
  let inventoryFeed  = $state(context.draft?.inventoryFeed ?? '');
  let sellerName     = $state(context.draft?.sellerName ?? '');

  function next(): void {
    const priceOk = Number(price) > 0;
    const codeOk = /^[A-Z]{3}$/.test((priceCurrency ?? '').trim());
    const hasCheckout = (checkout ?? '').trim().length > 0;
    const checkoutOk = hasCheckout ? isAbsUrl(checkout) : false;

    if (!priceOk) { throw new Error('Price must be > 0.'); }
    if (!codeOk) { throw new Error('Currency must be ISO-4217 (e.g. EUR, USD).'); }
    if (!checkoutOk) { throw new Error('Checkout must be an absolute URL.'); }

    context.draft = {
      ...context.draft!,
      price: Number(price),
      priceCurrency: priceCurrency.trim(),
      checkout: checkout.trim(),
      availability: availability || undefined,
      availabilityFeed: availabilityFeed || undefined,
      inventoryFeed: inventoryFeed || undefined,
      sellerName: sellerName || undefined,
    };

    popupControls.open({
      title: 'Offer • Preview & Publish',
      component: OfferStep3,
      props: { context }
    });
  }

  function isAbsUrl(s: string): boolean { try { new URL(s); return true; } catch { return false; } }
</script>

<div class="space-y-3">
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <label class="form-control">
      <span class="label-text">Price</span>
      <input class="input input-bordered" type="number" step="0.01" min="0" bind:value={price} />
    </label>
    <label class="form-control">
      <span class="label-text">Currency</span>
      <input class="input input-bordered" bind:value={priceCurrency} placeholder="EUR" />
    </label>
    <label class="form-control">
      <span class="label-text">Seller name (optional)</span>
      <input class="input input-bordered" bind:value={sellerName} />
    </label>
  </div>

  <label class="form-control">
    <span class="label-text">Checkout URL</span>
    <input class="input input-bordered" bind:value={checkout} placeholder="https://…" />
  </label>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <label class="form-control">
      <span class="label-text">Availability IRI (optional)</span>
      <input class="input input-bordered" bind:value={availability} placeholder="https://schema.org/InStock" />
    </label>
    <label class="form-control">
      <span class="label-text">Availability feed URL (optional)</span>
      <input class="input input-bordered" bind:value={availabilityFeed} placeholder="https://…" />
    </label>
    <label class="form-control">
      <span class="label-text">Inventory feed URL (optional)</span>
      <input class="input input-bordered" bind:value={inventoryFeed} placeholder="https://…" />
    </label>
  </div>

  <div class="mt-4 flex justify-end">
    <button type="button" class="btn btn-primary" onclick={next}>Next</button>
  </div>
</div>
