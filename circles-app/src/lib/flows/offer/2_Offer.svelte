<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import type { OfferFlowContext } from './context';
  import { validationErrors } from './context';
  import { popupControls } from '$lib/stores/popUp';
  import OfferStep3 from './3_Preview.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';

  interface Props { context?: OfferFlowContext }
  let { context = $bindable({}) }: Props = $props();

  const errors = $derived(validationErrors(context));
  const sellerAddr: string | undefined = $derived(avatarState.avatar?.address?.toLowerCase());
  const sellerName: string | undefined = $derived(avatarState.profile?.name);

  function next() {
    popupControls.open({
      title: 'Preview',
      component: OfferStep3,
      props: { context }
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-4 p-1">
    <div>
      <div class="font-semibold mb-2">Offer</div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Price</span></div>
          <input type="number" step="0.00000001" class="input input-bordered w-full" bind:value={context.price} placeholder="19" />
        </label>
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Currency (ISO-4217)</span></div>
          <input class="input input-bordered w-full" bind:value={context.priceCurrency} placeholder="EUR" />
        </label>
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Checkout URL</span></div>
          <input class="input input-bordered w-full" bind:value={context.checkoutUrl} placeholder="https://shop.example.com/checkout?id=..." />
        </label>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">availabilityFeed (URI)</span></div>
          <input class="input input-bordered w-full" bind:value={context.availabilityFeed} placeholder="https://api.example.com/availability/tee" />
        </label>
        <label class="form-control w-full">
          <div class="label"><span class="label-text">inventoryFeed (URI)</span></div>
          <input class="input input-bordered w-full" bind:value={context.inventoryFeed} placeholder="https://api.example.com/inventory/tee" />
        </label>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">priceValidUntil (ISO UTC)</span></div>
          <input class="input input-bordered w-full" bind:value={context.priceValidUntil} placeholder="2024-08-22T10:30:00Z" />
        </label>
        <label class="form-control w-full">
          <div class="label"><span class="label-text">dateModified (ISO UTC)</span></div>
          <input class="input input-bordered w-full" bind:value={context.offerDateModified} placeholder="2024-08-22T10:30:00Z" />
        </label>
      </div>
    </div>

    <div class="bg-base-100 border border-base-300 rounded-lg p-3 text-sm">
      <div class="font-medium mb-1">Seller</div>
      {#if sellerAddr}
        <div class="opacity-80">{sellerName ? `${sellerName} · ` : ''}{sellerAddr}</div>
        <div class="text-xs opacity-60 mt-1">Seller is fixed to your current avatar. Change avatar to publish under a different seller.</div>
      {:else}
        <div class="opacity-80">No avatar selected. Connect wallet and select an avatar to proceed.</div>
      {/if}
    </div>

    {#if errors.length}
      <div class="alert alert-warning text-sm">
        <div>
          <div class="font-semibold">Please check:</div>
          <ul class="list-disc pl-5">
            {#each errors as e}<li>{e}</li>{/each}
          </ul>
        </div>
      </div>
    {/if}

    <div class="flex gap-2 justify-between items-center">
      <div class="text-xs opacity-60">Seller address is taken from your avatar automatically.</div>
      <button class="btn btn-primary" onclick={next} disabled={!sellerAddr}>Next</button>
    </div>
  </div>
</FlowDecoration>
