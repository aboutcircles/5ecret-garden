<script lang="ts">
  import {get} from 'svelte/store';
  import { popupControls } from '$lib/shared/state/popup';
  import { openStep, popToOrOpen } from '$lib/shared/flow';
  import {runTask} from '$lib/shared/utils/tasks';
  import {wallet} from '$lib/shared/state/wallet.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import type {Address} from '@aboutcircles/sdk-types';

  import ProductGallery from '$lib/areas/market/ui/product/ProductGallery.svelte';
  import ProductPreviewCard from '$lib/areas/market/ui/product/ProductPreviewCard.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { OFFER_FLOW_SCAFFOLD_BASE } from './constants';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import OfferStep1 from './1_Product.svelte';
  import OfferStep2 from './2_Pricing.svelte';

  import type {OfferFlowContext} from '$lib/areas/market/flows/offer/types';
  import {ipfsGatewayUrl} from '$lib/shared/utils/ipfs';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import {resolveImagesToHttpUrls} from '$lib/shared/media/resolveImageUrl';
  import {createOffersClientForAvatar} from '$lib/areas/market/offers';
  import {getWalletProvider} from '$lib/shared/integrations/wallet';
  import {gnosisConfig} from "$lib/shared/config/circles";
  import { assertWalletCanSignForSafe } from '$lib/shared/integrations/safe/assertWalletCanSignForSafe';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  let selectedGateway: string = $state((context.draft?.paymentGateway ?? '') as string);
  $effect(() => { selectedGateway = (context.draft?.paymentGateway ?? '') as string; });

  function asAddress(s: string | undefined): Address | undefined { return s as unknown as Address; }

  const hasOperator = $derived.by(() => {
    try {
      normalizeAddress(String((context as any).operator ?? ''));
      return true;
    } catch {
      return false;
    }
  });

  const requiredOk = $derived.by(() => {
    const d = context.draft!;
    const hasProduct = !!d?.sku && !!d?.name;
    const hasOffer = (d?.price ?? 0) > 0 && /^[A-Z]{3}$/.test(d?.priceCurrency ?? '');
    const hasGateway = !!d?.paymentGateway;
    return hasOperator && hasProduct && hasOffer && hasGateway;
  });

  function getAllImages(): string[] {
    const draft = context.draft;

    if (draft?.images && Array.isArray(draft.images) && draft.images.length > 0) {
      return draft.images.filter((u: unknown) => typeof u === 'string' && u.trim().length > 0) as string[];
    }

    if (typeof draft?.image === 'string' && draft.image.trim().length > 0) {
      return [draft.image.trim()];
    }

    return [];
  }

  async function publish(): Promise<void> {
    if (!requiredOk) throw new Error('Draft has missing or invalid fields.');

    const draft = context.draft!;

    const walletVal = get(wallet);
    const sellerRaw = walletVal?.address as Address | undefined;
    let seller: Address;
    try {
      seller = normalizeAddress(String(sellerRaw)) as Address;
    } catch {
      throw new Error('Wallet avatar address is required to publish an offer.');
    }

    await assertWalletCanSignForSafe(seller);

    const eth = getWalletProvider();

    const { offers: client, media } = await createOffersClientForAvatar({
      avatar: seller,
      chainId: gnosisConfig.production.marketChainId,
      ethereum: eth,
      pinApiBase: (context as any).pinApiBase,
      gatewayUrlForCid: (cid) => ipfsGatewayUrl(cid),
    });

    const hasImagesArray = Array.isArray(draft.images) && draft.images.length > 0;
    const hasLegacyImage = typeof draft.image === 'string' && draft.image.length > 0;
    const productImages = hasImagesArray ? draft.images : (hasLegacyImage ? [draft.image] : undefined);

    await runTask({
      name: 'Publishing offer…',
      promise: (async () => {
        let finalImageUrls: string[] | undefined = undefined;
        if (Array.isArray(productImages) && productImages.length > 0) {
          if (!media) {
            throw new Error('Media pinning not available (missing pinApiBase).');
          }
          const imgs = productImages as string[];
          finalImageUrls = await resolveImagesToHttpUrls(imgs, {
            gatewayUrlForCid: media.gatewayUrlForCid,
            pinMediaBytes: media.pinMediaBytes,
          });
        }

        context.result = await client.appendOffer({
          avatar: seller,
          operator: context.operator,
          chainId: gnosisConfig.production.marketChainId,
          paymentGateway: context.draft?.paymentGateway as Address,
          product: {
            sku: draft.sku,
            name: draft.name,
            description: draft.description || undefined,
            image: finalImageUrls,
            url: draft.url || undefined,
            brand: draft.brand || undefined,
            mpn: draft.mpn || undefined,
            gtin13: draft.gtin13 || undefined,
            category: draft.category || undefined,
          },
          offer: {
            price: Number(draft.price),
            priceCurrency: draft.priceCurrency!,
            url: draft.url || undefined,
            availableDeliveryMethod: draft.availableDeliveryMethod || undefined,
            requiredSlots: Array.isArray(draft.requiredSlots) && draft.requiredSlots.length > 0
              ? draft.requiredSlots
                .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
                .filter((s: string) => s.length > 0)
              : undefined,
          },
        });
      })(),
    });

    popupControls.close();
  }

  function editProduct(): void {
    popToOrOpen(OfferStep1, {
      title: 'Offer • Product',
      props: { context },
    });
  }

  function editPricing(): void {
    popToOrOpen(OfferStep2, {
      title: 'Offer • Pricing',
      props: { context },
    });
  }
</script>
<FlowStepScaffold
  {...OFFER_FLOW_SCAFFOLD_BASE}
  step={3}
  title="Preview & Publish"
  subtitle="Review your offer details before publishing."
>

{#if !requiredOk}
    <StepAlert variant="warning" className="mb-2" message="Draft has missing or invalid fields." />
{/if}

<div class="space-y-2">
    <StepSection title="Review" subtitle="Check core product and pricing details.">
      <div class="space-y-3">
        <StepReviewRow label="Product" value={context.draft?.name ?? '—'} onChange={editProduct} changeLabel="Edit" />
        <StepReviewRow label="Pricing" value={`${context.draft?.price ?? '—'} ${context.draft?.priceCurrency ?? ''}`.trim()} onChange={editPricing} changeLabel="Edit" />
      </div>
    </StepSection>

    <div class="bg-base-100 border rounded-lg p-3 space-y-3">
        <ProductPreviewCard
          title={context.draft?.name ?? '—'}
          subtitle={context.draft?.sku ? `SKU: ${context.draft?.sku}` : undefined}
          description={context.draft?.description || undefined}
          imageUrl={getAllImages()[0] ?? context.draft?.image ?? undefined}
          size="md"
        >
          <div slot="meta" class="text-sm space-y-2">
            <div class="font-semibold">Payment gateway</div>
            {#if selectedGateway}
              <div class="flex items-center gap-2">
                <Avatar address={asAddress(selectedGateway)} view="small_no_text" clickable={false} />
                <span class="text-xs font-mono truncate">{selectedGateway}</span>
              </div>
            {:else}
              <span class="opacity-70 text-sm">No payment gateway selected. Go back to Pricing to select one.</span>
            {/if}
            <div><strong>Price:</strong> {context.draft?.price} {context.draft?.priceCurrency}</div>
          </div>
        </ProductPreviewCard>

        {#if getAllImages().length > 1}
          <div class="mt-2">
            <ProductGallery images={getAllImages()} />
          </div>
        {/if}
    </div>

    <StepSection title="Delivery & checkout" subtitle="Confirm delivery method and required checkout info.">
      {#if context.draft?.availableDeliveryMethod}
        <div class="truncate"><strong>Delivery method:</strong> {context.draft?.availableDeliveryMethod}</div>
      {:else}
        <div class="text-sm text-base-content/70">No delivery method specified.</div>
      {/if}
      {#if Array.isArray(context.draft?.requiredSlots) && context.draft?.requiredSlots.length > 0}
        <div class="truncate">
          <strong>Checkout requirements:</strong>
          {context.draft?.requiredSlots.join(', ')}
        </div>
      {:else}
        <div class="text-sm text-base-content/70">No checkout requirements specified.</div>
      {/if}
    </StepSection>

    <StepActionBar>
      {#snippet primary()}
          <ActionButton action={publish} disabled={!requiredOk} title="Publish">
            {#snippet children()}Publish{/snippet}
          </ActionButton>
      {/snippet}
    </StepActionBar>
</div>
  </FlowStepScaffold>







