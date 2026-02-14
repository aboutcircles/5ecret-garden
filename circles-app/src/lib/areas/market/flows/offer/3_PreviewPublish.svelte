<script lang="ts">
  import {get} from 'svelte/store';
  import { popupControls } from '$lib/shared/state/popup';
  import { openStep, popToOrOpen } from '$lib/shared/flow';
  import {runTask} from '$lib/shared/utils/tasks';
  import {wallet} from '$lib/shared/state/wallet.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import type {Address} from '@circles-sdk/utils';

  import ProductGallery from '$lib/areas/market/ui/product/ProductGallery.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { OFFER_FLOW_SCAFFOLD_BASE } from './constants';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import OfferStep1 from './1_Product.svelte';
  import OfferStep2 from './2_Pricing.svelte';

  import {Contract, JsonRpcProvider} from 'ethers';

  import type {OfferFlowContext} from '$lib/areas/market/flows/offer/types';
  import {ensureGnosisChain} from '$lib/shared/integrations/chain/gnosis';
  import {ipfsGatewayUrl} from '$lib/shared/utils/ipfs';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import {resolveImagesToHttpUrls} from '$lib/shared/media/resolveImageUrl';
  import {createOffersClientForAvatar} from '$lib/areas/market/offers';
  import {getWalletProvider} from '$lib/shared/integrations/wallet';
  import {gnosisConfig} from "$lib/shared/config/circles";

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

  const SAFE_VIEW_ABI = [
    'function getOwners() view returns (address[])',
    'function getThreshold() view returns (uint256)',
  ];

  async function getSafeInfo(safe: Address): Promise<{ owners: Address[]; threshold: number }> {
    const provider = new JsonRpcProvider('https://rpc.aboutcircles.com');
    const contract = new Contract(safe, SAFE_VIEW_ABI, provider);

    const owners = (await (contract.getOwners() as Promise<string[]>)).map((o) => o.toLowerCase() as Address);
    const thresholdRaw = await (contract.getThreshold() as Promise<bigint | number>);
    const threshold = typeof thresholdRaw === 'bigint' ? Number(thresholdRaw) : thresholdRaw;

    return { owners, threshold };
  }

  function ownersPreview(owners: string[], max: number = 3): string {
    if (owners.length <= max) return owners.join(', ');
    return `${owners.slice(0, max).join(', ')}, …(+${owners.length - max})`;
  }

  async function resolveOwnerAndAssertSafe(safe: Address): Promise<{ owner: Address }> {
    const eth = getWalletProvider();

    await ensureGnosisChain(eth);

    const accs: string[] = await eth.request({ method: 'eth_requestAccounts' }) as string[];
    const owner = (accs?.[0] ?? '').toLowerCase() as Address;
    if (!/^0x[a-f0-9]{40}$/.test(owner)) throw new Error('No EOA account unlocked in wallet');
    if (owner === safe.toLowerCase()) throw new Error('Selected account equals the Safe. Switch to a Safe owner EOA.');

    const info = await getSafeInfo(safe);

    if (info.threshold !== 1) {
      throw new Error(`Safe threshold must be 1 for this flow (current: ${info.threshold}).`);
    }

    const belongs = new Set(info.owners).has(owner);
    if (!belongs) {
      const preview = ownersPreview(info.owners);
      throw new Error(`Connected account ${owner} is not an owner of Safe ${safe}. Owners: ${preview}`);
    }

    return { owner };
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

    await resolveOwnerAndAssertSafe(seller);

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

    <div class="bg-base-100 border rounded-lg p-3">
        <div class="font-semibold truncate">
            {context.draft?.name}
            <span class="opacity-60">({context.draft?.sku})</span>
        </div>

        <!-- Show product gallery if images exist -->
        {#if getAllImages().length > 0}
          <ProductGallery images={getAllImages()} />
        {:else if context.draft?.image}
            <!-- Fallback to single image for legacy support -->
            <img alt="preview" class="w-full h-40 object-cover rounded mt-2" src={context.draft?.image}/>
        {/if}

        {#if context.draft?.description}
            <Markdown content={context.draft.description} class="prose prose-sm max-w-none mt-2" />
        {/if}

        <div class="mt-3 text-sm space-y-1">
            <div class="flex items-center gap-3">
              <div class="font-semibold">Payment gateway:</div>
              {#if selectedGateway}
                <Avatar address={asAddress(selectedGateway)} view="horizontal" bottomInfo={selectedGateway} clickable={false} />
              {:else}
                <span class="opacity-70 text-sm">No payment gateway selected. Go back to Pricing to select one.</span>
              {/if}
            </div>
            <div><strong>Price:</strong> {context.draft?.price} {context.draft?.priceCurrency}</div>
            {#if context.draft?.availableDeliveryMethod}
              <div class="truncate"><strong>Delivery method:</strong> {context.draft?.availableDeliveryMethod}</div>
            {/if}
            {#if Array.isArray(context.draft?.requiredSlots) && context.draft?.requiredSlots.length > 0}
              <div class="truncate">
                <strong>Checkout requirements:</strong>
                {context.draft?.requiredSlots.join(', ')}
              </div>
            {/if}
        </div>
    </div>

    <StepActionBar>
      {#snippet primary()}
          <ActionButton action={publish} disabled={!requiredOk} title="Publish">
            {#snippet children()}Publish{/snippet}
          </ActionButton>
      {/snippet}
    </StepActionBar>
</div>
  </FlowStepScaffold>

