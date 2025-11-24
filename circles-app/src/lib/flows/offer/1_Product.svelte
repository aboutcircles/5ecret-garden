<script lang="ts">
  import { popupControls } from '$lib/stores/popUp';
  import OfferStep2 from './2_Pricing.svelte';
  import type { OfferFlowContext, OfferDraft } from './types';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  import { normalizeAddress } from '$lib/offers/adapters';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  // Hard guard: we must know which namespace/operator to publish under
  let hasOperator = false;
  try {
    const op = normalizeAddress(String((context as any)?.operator ?? ''));
    (context as any).operator = op; // store normalized value once
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
      priceCurrency: 'EUR',
    } as OfferDraft;
  }

  // Local bindings for form inputs
  let sku         = $state(context.draft.sku);
  let name        = $state(context.draft.name);
  let description = $state(context.draft.description ?? '');
  let image       = $state(context.draft.image ?? '');
  // New: support multiple images via uploader
  let images      = $state<string[]>(context.draft.images ?? []);
  let url         = $state(context.draft.url ?? '');
  let brand       = $state(context.draft.brand ?? '');
  let mpn         = $state(context.draft.mpn ?? '');
  let gtin13      = $state(context.draft.gtin13 ?? '');
  let category    = $state(context.draft.category ?? '');

  function next(): void {
    const skuOk = /^[a-z0-9][a-z0-9-_]{0,62}$/.test(sku);
    const nameOk = name.trim().length > 0;

    if (!skuOk) { throw new Error('SKU must be [a-z0-9-_], max 63 chars, no leading "-" or "_".'); }
    if (!nameOk) { throw new Error('Name is required.'); }

    // Robust normalization to avoid undefined access and keep legacy `image` in sync
    const hasImagesArray = Array.isArray(images) && images.length > 0;
    const hasLegacyImage = typeof image === 'string' && image.trim().length > 0;

    const imagesNormalized: string[] = hasImagesArray
      ? [...images]
      : hasLegacyImage
        ? [image]
        : [];

    const imagesField = imagesNormalized.length > 0 ? imagesNormalized : undefined;
    const legacyImageField = hasLegacyImage ? image : (imagesNormalized[0] ?? undefined);

    context.draft = {
      ...context.draft!,
      sku,
      name,
      description: description || undefined,
      images: imagesField,
      image: legacyImageField,
      url: url || undefined,
      brand: brand || undefined,
      mpn: mpn || undefined,
      gtin13: gtin13 || undefined,
      category: category || undefined,
    };

    popupControls.open({
      title: 'Offer • Pricing',
      component: OfferStep2,
      props: { context }
    });
  }
</script>

<div class="space-y-3">
  <label class="form-control">
    <span class="label-text">SKU</span>
    <input class="input input-bordered" bind:value={sku} placeholder="coffee-250g" />
  </label>
  <label class="form-control">
    <span class="label-text">Name</span>
    <input class="input input-bordered" bind:value={name} placeholder="Coffee 250g" />
  </label>
  <label class="form-control">
    <span class="label-text">Description</span>
    <textarea class="textarea textarea-bordered" rows="3" bind:value={description} />
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
  <label class="form-control">
    <span class="label-text">Image URL (legacy / optional)</span>
    <input class="input input-bordered" bind:value={image} placeholder="https://…" />
  </label>
  <label class="form-control">
    <span class="label-text">Product URL</span>
    <input class="input input-bordered" bind:value={url} placeholder="https://…" />
  </label>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <label class="form-control">
      <span class="label-text">Brand</span>
      <input class="input input-bordered" bind:value={brand} />
    </label>
    <label class="form-control">
      <span class="label-text">MPN</span>
      <input class="input input-bordered" bind:value={mpn} />
    </label>
    <label class="form-control">
      <span class="label-text">GTIN-13</span>
      <input class="input input-bordered" bind:value={gtin13} />
    </label>
  </div>

  <label class="form-control">
    <span class="label-text">Category</span>
    <input class="input input-bordered" bind:value={category} placeholder="Grocery" />
  </label>

  <div class="mt-4 flex justify-end">
    <button type="button" class="btn btn-primary" onclick={next}>Next</button>
  </div>
</div>
