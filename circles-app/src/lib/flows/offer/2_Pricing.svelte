<script lang="ts">
  import { popupControls } from '$lib/stores/popUp';
  import OfferStep3 from './3_PreviewPublish.svelte';
  import type { OfferFlowContext } from './types';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  let price            = $state(context.draft?.price ?? 0);
  let priceCurrency    = $state(context.draft?.priceCurrency ?? 'EUR');
  let availabilityFeed = $state(context.draft?.availabilityFeed ?? '');
  let inventoryFeed    = $state(context.draft?.inventoryFeed ?? '');
  let availableDeliveryMethod = $state(context.draft?.availableDeliveryMethod ?? '');

  function next(): void {
    const priceOk = Number(price) > 0;
    const codeOk = /^[A-Z]{3}$/.test((priceCurrency ?? '').trim());

    if (!priceOk) { throw new Error('Price must be > 0.'); }
    if (!codeOk) { throw new Error('Currency must be ISO-4217 (e.g. EUR, USD).'); }

    context.draft = {
      ...context.draft!,
      price: Number(price),
      priceCurrency: priceCurrency.trim(),
      availabilityFeed: availabilityFeed || undefined,
      inventoryFeed: inventoryFeed || undefined,
      availableDeliveryMethod: availableDeliveryMethod || undefined,
    };

    popupControls.open({
      title: 'Offer • Preview & Publish',
      component: OfferStep3,
      props: { context }
    });
  }

  // Persist form state into the shared draft reactively to avoid losing data when navigating back
  $effect(() => {
    context.draft = {
      ...context.draft!,
      price: Number(price) || undefined,
      priceCurrency: (priceCurrency ?? '').trim() || undefined,
      availabilityFeed: (availabilityFeed ?? '').trim() || undefined,
      inventoryFeed: (inventoryFeed ?? '').trim() || undefined,
      availableDeliveryMethod: (availableDeliveryMethod ?? '').trim() || undefined,
    };
  });
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
      <span class="label-text">Delivery method (optional)</span>
      <select class="select select-bordered" bind:value={availableDeliveryMethod}>
        <option value="">Not specified</option>
        <option value="http://purl.org/goodrelations/v1#DeliveryModePickUp">Pick up</option>
        <option value="http://purl.org/goodrelations/v1#DeliveryModeOwnFleet">Own fleet</option>
        <option value="http://purl.org/goodrelations/v1#DeliveryModeMail">Mail</option>
        <option value="http://purl.org/goodrelations/v1#DeliveryModeFreight">Freight</option>
        <option value="http://purl.org/goodrelations/v1#DeliveryModeDHL">DHL</option>
        <option value="http://purl.org/goodrelations/v1#DeliveryModeUPS">UPS</option>
        <option value="http://purl.org/goodrelations/v1#DeliveryModeFedEx">FedEx</option>
      </select>
    </label>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
