<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import type { AggregatedCatalogItem } from '$lib/areas/market/model';
  import ProductCard from '$lib/areas/market/ui/product/ProductCard.svelte';
  import { browser } from '$app/environment';

  type Props = {
    avatarAddress: Address | '';
    marketLoading: boolean;
    marketErrorMsg: string;
    marketProducts: any[];
    openCreateListing: () => void;
    loadSellerCatalog: () => Promise<void>;
    onProductUpdated?: (item: AggregatedCatalogItem) => void;
    onProductRemoved?: (sku: string) => void;
  };

  let {
    avatarAddress,
    marketLoading,
    marketErrorMsg,
    marketProducts,
    openCreateListing,
    loadSellerCatalog,
    onProductUpdated,
    onProductRemoved,
  }: Props = $props();

  // Avoid "Connect" flash: check localStorage for a saved session before
  // concluding there is no avatar. The wallet restore takes a moment.
  const hasSavedSession = browser && !!window.localStorage.getItem('Circles.Storage');
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">Offers</h3>
      <p class="text-xs text-base-content/70 mt-0.5">Manage the offers you publish.</p>
    </div>
    {#if avatarAddress}
      <button class="btn btn-primary btn-sm" onclick={openCreateListing}>Create listing</button>
    {/if}
  </div>
</section>

{#if !avatarAddress && hasSavedSession}
  <div class="flex flex-col items-center justify-center py-12">
    <div class="loading loading-spinner loading-md" aria-label="loading"></div>
    <div class="mt-2 text-sm text-base-content/70">Restoring session…</div>
  </div>
{:else if !avatarAddress}
  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <div class="text-sm opacity-70">Connect a Circles avatar to see your marketplace listings.</div>
  </section>
{:else}
  {#if marketLoading}
    <div class="flex flex-col items-center justify-center h-[50vh]">
      <div class="loading loading-spinner loading-lg" aria-label="loading"></div>
      <div class="mt-3 text-base-content/70">Loading listings…</div>
    </div>
  {:else if marketErrorMsg}
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
      <div class="alert alert-error"><span class="font-semibold">Failed to load:</span>&nbsp;{marketErrorMsg}</div>
    </section>
  {:else}
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-sm font-semibold m-0">Listings</h3>
          <p class="text-xs text-base-content/70 mt-0.5">
            {marketProducts.length ? `${marketProducts.length} active listing(s).` : 'No active listings yet.'}
          </p>
        </div>
      </div>

      {#if marketProducts.length === 0}
        <div class="text-center py-8 opacity-60">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-12 w-12 mx-auto mb-2 text-base-content/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <div>No listings found for this seller</div>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each marketProducts as p (p.product?.sku ?? p.productCid)}
            <ProductCard
              product={p}
              showSellerInfo={false}
              ondeleted={() => {
                const sku = p.product?.sku;
                if (sku && onProductRemoved) {
                  onProductRemoved(sku);
                } else {
                  void loadSellerCatalog();
                }
              }}
              onupdated={onProductUpdated}
              canTombstone={true}
            />
          {/each}
        </div>
      {/if}
    </section>
  {/if}
{/if}
