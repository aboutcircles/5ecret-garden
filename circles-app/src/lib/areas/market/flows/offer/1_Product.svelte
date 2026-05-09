<script lang="ts">
  import {popupControls} from '$lib/shared/state/popup';
  import { openStep } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
  import { OFFER_FLOW_SCAFFOLD_BASE } from './constants';
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
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    context: OfferFlowContext;
  }

  let {context}: Props = $props();

  let hasOperator = false;
  try {
    (context as any).operator = normalizeAddress(String((context as any)?.operator ?? ''));
    hasOperator = true;
  } catch {
    hasOperator = false;
  }

  if (!hasOperator) {
    throw new Error('Marketplace operator address is required to create an offer.');
  }

  if (!context.draft) {
    context.draft = {
      sku: '', name: '', description: '', image: '', images: [],
      url: '', brand: '', mpn: '', gtin13: '', category: '', priceCurrency: 'CRC',
    } as OfferDraft;
  }

  function normalizeDraftImages(d: OfferDraft): string[] {
    const arr = Array.isArray(d.images) ? d.images : [];
    const cleaned = arr.map((x) => x.trim()).filter((x) => x.length > 0);
    if (cleaned.length > 0) return cleaned;
    const legacy = typeof d.image === 'string' ? d.image.trim() : '';
    return legacy ? [legacy] : [];
  }

  let sku = $state(context.draft.sku);
  let name = $state(context.draft.name);
  let description = $state(context.draft.description ?? '');
  let images = $state<string[]>(normalizeDraftImages(context.draft));
  let url = $state(context.draft.url ?? '');
  let brand = $state(context.draft.brand ?? '');
  let mpn = $state(context.draft.mpn ?? '');
  let gtin13 = $state(context.draft.gtin13 ?? '');
  let category = $state(context.draft.category ?? '');

  const editMode: boolean = Boolean((context as any)?.editMode);
  let showAdvanced = $state(false);
  let hasGateway = $state(true);

  onMount(async () => {
    try {
      const c = get(circles);
      const owner = get(wallet)?.address as string | undefined;
      if (!c?.circlesRpc || !owner) { hasGateway = false; return; }
      const gateways = await fetchGatewayRowsByOwner(c, owner);
      hasGateway = gateways.length > 0;
    } catch (e) {
      console.error('Offer step 1 gateway validation failed', e);
      hasGateway = false;
    }
  });

  let autoSku = $state('');
  $effect(() => { autoSku = generateSku(name || ''); });

  function goToPaymentSettings(): void {
    popupControls.closeAndThen(() => { void goto('/settings?tab=payment'); });
  }

  function next(): void {
    const hasManualSku = (sku ?? '').trim().length > 0;
    const skuOk = hasManualSku ? isValidSku(sku) : true;
    const nameOk = name.trim().length > 0;

    if (!skuOk) throw new Error('SKU must be [a-z0-9-_], max 63 chars, no leading "-" or "_".');
    if (!nameOk) throw new Error('Name is required.');

    const imgs = images.map((x) => x.trim()).filter((x) => x.length > 0);
    const nextSku = editMode ? (context.draft!.sku || sku) : (hasManualSku ? sku : autoSku);

    context.draft = {
      ...context.draft!,
      sku: nextSku, name,
      description: description || undefined,
      images: imgs.length > 0 ? imgs : undefined,
      image: imgs[0] || undefined,
      url: url || undefined, brand: brand || undefined,
      mpn: mpn || undefined, gtin13: gtin13 || undefined,
      category: category || undefined,
    };

    openStep({ title: 'Offer • Pricing', component: OfferStep2, props: { context } });
  }

  const eyebrow = `font-size:10px;font-weight:600;color:${T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 6px 2px;display:block;`;
  const inputStyle = `width:100%;padding:10px 14px;border:1px solid ${T.hairline};border-radius:10px;font-family:${T.fontSans};font-size:13px;color:${T.ink};background:${T.surface};box-sizing:border-box;`;
</script>

<FlowStepScaffold
  {...OFFER_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Product"
  subtitle="Set core product information for this offer."
>

{#if $wallet?.address}
  {#if hasGateway}
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <span style={eyebrow}>Name</span>
        <input style={inputStyle} bind:value={name} placeholder="Coffee 250g" data-popup-initial-input />
        {#if !(sku && sku.trim().length > 0)}
          <div style="font-size:11px;color:{T.inkMuted};margin-top:4px;padding-left:2px;">sku: {autoSku}</div>
        {/if}
      </div>

      <div>
        <span style={eyebrow}>Description</span>
        <MarkdownEditor bind:value={description} rows={3} placeholder="Write a description (Markdown supported)…" />
      </div>

      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style={eyebrow}>Images</span>
          <span style="font-size:11px;color:{T.inkMuted};">You can add multiple images</span>
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
      <details style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:12px;overflow:hidden;">
        <summary style="padding:10px 14px;font-size:13px;font-weight:540;color:{T.ink};cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;">
          <span>Advanced</span>
          <span style="font-size:11px;color:{T.inkMuted};">Optional fields</span>
        </summary>
        <div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:12px;">
          <div>
            <span style={eyebrow}>Product URL</span>
            <input style={inputStyle} bind:value={url} placeholder="https://…" />
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">
            <div>
              <span style={eyebrow}>Brand</span>
              <input style={inputStyle} bind:value={brand} />
            </div>
            <div>
              <span style={eyebrow}>MPN</span>
              <input style={inputStyle} bind:value={mpn} />
            </div>
            <div>
              <span style={eyebrow}>GTIN-13</span>
              <input style={inputStyle} bind:value={gtin13} />
            </div>
          </div>

          <div>
            <span style={eyebrow}>Category</span>
            <input style={inputStyle} bind:value={category} placeholder="Grocery" />
          </div>

          <div>
            <span style={eyebrow}>SKU {editMode ? '(locked)' : ''}</span>
            <input style={inputStyle} bind:value={sku} placeholder={autoSku} disabled={editMode} readonly={editMode} />
            <div style="font-size:11px;color:{T.inkMuted};margin-top:4px;padding-left:2px;">
              {#if editMode}
                SKU cannot be changed for existing products.
              {:else}
                Leave empty to auto-generate from name. Allowed: a–z, 0–9, dashes and underscores; max 63 chars.
              {/if}
            </div>
          </div>
        </div>
      </details>

      <StepActionButtons primaryLabel="Continue" onPrimary={next} />
    </div>
  {:else}
    <StepAlert variant="info" title="Payment gateway required">
      <span>
        You need a payment gateway to create an offer. Please
        <button
          type="button"
          style="border:0;background:transparent;color:{T.primary};font-size:inherit;cursor:pointer;text-decoration:underline;padding:0;"
          onclick={goToPaymentSettings}
        >create a gateway</button>
        and come back.
      </span>
    </StepAlert>
  {/if}
{:else}
  <StepAlert variant="warning" message="Connect your wallet to continue." />
{/if}
</FlowStepScaffold>

<style>
  summary::-webkit-details-marker { display: none; }
</style>
