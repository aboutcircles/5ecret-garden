<script lang="ts">
  import {popupControls} from '$lib/shared/state/popup';
  import { openStep } from '$lib/shared/flow/runtime';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import MarkdownEditor from '$lib/shared/ui/content/markdown/MarkdownEditor.svelte';
  import OfferStep2 from './2_Pricing.svelte';
  import type {OfferDraft, OfferFlowContext} from './types';
  import ImageUpload from '$lib/shared/ui/profile/components/ImageUpload.svelte';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import {generateSku, isValidSku} from '$lib/areas/market/utils/offer';
  import {get} from 'svelte/store';
  import {circles} from '$lib/shared/state/circles';
  import {wallet} from '$lib/shared/state/wallet.svelte';
  import { fetchGatewayRowsByOwner } from '$lib/shared/data/circles/paymentGateways';
  import {onMount} from 'svelte';
  import {goto} from '$app/navigation';

  interface Props {
    context: OfferFlowContext;
  }

  let {context}: Props = $props();

  // Hard guard: we must know which namespace/operator to publish under
  let hasOperator = false;
  try {
    (context as any).operator = normalizeAddress(String((context as any)?.operator ?? '')); // store normalized value once
    hasOperator = true;
  } catch {
    hasOperator = false;
  }

  if (!hasOperator) {
    throw new Error('Marketplace operator address is required to create an offer.');
  }

  if (!context.draft) {
    context.draft = {
      sku: '',
      name: '',
      description: '',
      image: '',
      images: [],
      url: '',
      brand: '',
      mpn: '',
      gtin13: '',
      category: '',
      priceCurrency: 'CRC',
    } as OfferDraft;
  }

  function normalizeDraftImages(d: OfferDraft): string[] {
    const arr = Array.isArray(d.images) ? d.images : [];
    const cleaned = arr.map((x) => x.trim()).filter((x) => x.length > 0);
    if (cleaned.length > 0) return cleaned;

    const legacy = typeof d.image === 'string' ? d.image.trim() : '';
    return legacy ? [legacy] : [];
  }

  // Local bindings for form inputs
  let sku = $state(context.draft.sku);
  let name = $state(context.draft.name);
  let description = $state(context.draft.description ?? '');
  let images = $state<string[]>(normalizeDraftImages(context.draft));
  let url = $state(context.draft.url ?? '');
  let brand = $state(context.draft.brand ?? '');
  let mpn = $state(context.draft.mpn ?? '');
  let gtin13 = $state(context.draft.gtin13 ?? '');
  let category = $state(context.draft.category ?? '');

  // Are we editing an existing product?
  const editMode: boolean = Boolean((context as any)?.editMode);

  // Advanced section toggle
  let showAdvanced = $state(false);

  // Validate user has at least one payment gateway before proceeding in the flow
  let hasGateway = $state(true);
  onMount(async () => {
    try {
      const c = get(circles);
      const owner = get(wallet)?.address as string | undefined;
      if (!c?.circlesRpc || !owner) {
        hasGateway = false;
        return;
      }
      const gateways = await fetchGatewayRowsByOwner(c, owner);
      hasGateway = gateways.length > 0;
    } catch (e) {
      console.error('Offer step 1 gateway validation failed', e);
      hasGateway = false;
    }
  });

  // Live preview of auto-generated SKU, stored in state so we can reuse it when saving
  let autoSku = $state('');
  $effect(() => {
    autoSku = generateSku(name || '');
  });

  function goToPaymentSettings(): void {
    popupControls.close();
    goto('/settings?tab=payment');
  }

  function next(): void {
    const hasManualSku = (sku ?? '').trim().length > 0;
    const skuOk = hasManualSku ? isValidSku(sku) : true;
    const nameOk = name.trim().length > 0;

    if (!skuOk) {
      throw new Error('SKU must be [a-z0-9-_], max 63 chars, no leading "-" or "_".');
    }
    if (!nameOk) {
      throw new Error('Name is required.');
    }

    const imgs = images
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    const nextSku = editMode ? (context.draft!.sku || sku) : (hasManualSku ? sku : autoSku);

    context.draft = {
      ...context.draft!,
      sku: nextSku,
      name,
      description: description || undefined,
      images: imgs.length > 0 ? imgs : undefined,
      image: imgs[0] || undefined,
      url: url || undefined,
      brand: brand || undefined,
      mpn: mpn || undefined,
      gtin13: gtin13 || undefined,
      category: category || undefined,
    };

    openStep({
      title: 'Offer • Pricing',
      component: OfferStep2,
      props: { context },
    });
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader
      step={1}
      total={3}
      title="Product"
      subtitle="Set core product information for this offer."
      labels={['Product', 'Pricing', 'Review']}
    />

{#if $wallet?.address}
  {#if hasGateway}
    <div class="space-y-3">
      <!-- Name first; SKU is optional and hidden under Advanced -->
      <label class="form-control">
        <span class="label-text">Name</span>
        <input class="input input-bordered" bind:value={name} placeholder="Coffee 250g" data-popup-initial-input/>
      </label>

      <!-- Show live auto-generated SKU preview when no manual SKU provided -->
      {#if !(sku && sku.trim().length > 0)}
        <div class="text-sm opacity-70">sku: {autoSku}</div>
      {/if}
      <label class="form-control">
        <span class="label-text">Description</span>
        <MarkdownEditor
          bind:value={description}
          rows={3}
          placeholder="Write a description (Markdown supported)…"
        />
      </label>
      <!-- Images: either upload multiple or paste a single URL (legacy) -->
      <div class="space-y-2">
        <div class="label">
          <span class="label-text">Images</span>
          <span class="label-text-alt opacity-70">You can add multiple images</span>
        </div>
        <ImageUpload
            imageDataUrls={images}
            onnewimage={(dataUrl) => { images = [...images, dataUrl]; }}
            onremoveimage={(index) => { images = images.filter((_, i) => i !== index); }}
            onclearall={() => { images = []; }}
            mode="fit"
            cropWidth={1600}
            cropHeight={1600}
        />
      </div>

      <!-- Advanced section -->
      <div class="collapse bg-base-200">
        <input type="checkbox" bind:checked={showAdvanced}/>
        <div class="collapse-title text-md font-medium">Advanced</div>
        <div class="collapse-content space-y-3">
          <label class="form-control">
            <span class="label-text">Product URL</span>
            <input class="input input-bordered" bind:value={url} placeholder="https://…"/>
          </label>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label class="form-control">
              <span class="label-text">Brand</span>
              <input class="input input-bordered" bind:value={brand}/>
            </label>
            <label class="form-control">
              <span class="label-text">MPN</span>
              <input class="input input-bordered" bind:value={mpn}/>
            </label>
            <label class="form-control">
              <span class="label-text">GTIN-13</span>
              <input class="input input-bordered" bind:value={gtin13}/>
            </label>
          </div>

          <label class="form-control">
            <span class="label-text">Category</span>
            <input class="input input-bordered" bind:value={category} placeholder="Grocery"/>
          </label>
          <label class="form-control">
            <span class="label-text">SKU
              {#if editMode}(locked){/if}</span>
            <input class="input input-bordered" bind:value={sku} placeholder={autoSku} disabled={editMode}
                   readonly={editMode}/>
            <span class="label-text-alt opacity-70">
              {#if editMode}
                SKU cannot be changed for existing products.
              {:else}
                Leave empty to auto-generate from name. Allowed: a–z, 0–9, dashes and underscores; max 63 chars.
              {/if}
            </span>
          </label>
        </div>
      </div>

      <StepActionBar>
        {#snippet primary()}
          <button type="button" class="btn btn-primary btn-sm" onclick={next}>Continue</button>
        {/snippet}
      </StepActionBar>
    </div>
  {:else}
    <StepAlert variant="info" title="Payment gateway required">
      <span>
        You need a payment gateway to create an offer. Please
        <button type="button" class="link ml-1" onclick={goToPaymentSettings}>create a gateway</button>
        and come back.
      </span>
    </StepAlert>
  {/if}
{:else}
  <StepAlert variant="warning" message="Connect your wallet to continue." />
{/if}
  </div>
</FlowDecoration>
