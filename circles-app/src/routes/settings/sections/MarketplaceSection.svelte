<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import ProductCard from '$lib/components/ProductCard.svelte';

  type Props = {
    avatarAddress: Address | '';
    marketLoading: boolean;
    marketErrorMsg: string;
    marketProducts: any[];
    openCreateListing: () => void;
    loadSellerCatalog: () => Promise<void>;
  };

  let {
    avatarAddress,
    marketLoading,
    marketErrorMsg,
    marketProducts,
    openCreateListing,
    loadSellerCatalog,
  }: Props = $props();
</script>

{#if !avatarAddress}
  <div class="p-4 text-sm opacity-70">Connect a Circles avatar to see your marketplace listings.</div>
{:else}
  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <div class="flex items-center justify-between">
      <div class="text-sm">
        <strong>Create</strong>
        <div class="text-xs opacity-70 mt-0.5">Publish a new listing to your marketplace catalog.</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick={openCreateListing}>Create Listing</button>
    </div>
  </section>

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
        <div class="text-sm">
          <strong>Listings</strong>
          <span class="opacity-70">{marketProducts.length ? ` (${marketProducts.length})` : ''}</span>
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
          {#each marketProducts as p (p.productCid)}
            <ProductCard
              product={p}
              showSellerInfo={false}
              ondeleted={() => loadSellerCatalog()}
              canTombstone={true}
            />
          {/each}
        </div>
      {/if}
    </section>
  {/if}
{/if}
