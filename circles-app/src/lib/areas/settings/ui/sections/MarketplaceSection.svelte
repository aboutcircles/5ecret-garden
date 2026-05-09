<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import ProductCard from '$lib/areas/market/ui/product/ProductCard.svelte';
  import ProductCardPlaceholder from '$lib/shared/ui/lists/placeholders/ProductCardPlaceholder.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

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

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
  <div style="min-width:0;">
    <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Offers</h3>
    <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">Manage the offers you publish.</p>
  </div>
  {#if avatarAddress}
    <button
      type="button"
      style="display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
      onclick={openCreateListing}
    ><Icon name="plus" size={11} stroke="#fff" strokeWidth={2.4} /> Create listing</button>
  {/if}
</section>

{#if !avatarAddress}
  <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
    <div style="font-size:12.5px;color:{T.inkMuted};">Connect a Circles avatar to see your marketplace listings.</div>
  </section>
{:else}
  {#if marketLoading}
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {#each Array(6) as _, i (i)}
        <ProductCardPlaceholder />
      {/each}
    </div>
  {:else if marketErrorMsg}
    <section style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:14px;padding:12px 14px;width:100%;font-size:12px;color:{T.inkBody};">
      <strong>Failed to load:</strong> {marketErrorMsg}
    </section>
  {:else}
    <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
      <div style="margin-bottom:10px;">
        <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Listings</h3>
        <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">
          {marketProducts.length ? `${marketProducts.length} active listing${marketProducts.length === 1 ? '' : 's'}.` : 'No active listings yet.'}
        </p>
      </div>

      {#if marketProducts.length === 0}
        <div style="text-align:center;padding:40px 0;display:flex;flex-direction:column;align-items:center;gap:10px;">
          <div style="width:56px;height:56px;border-radius:16px;background:{T.surfaceAlt};display:inline-flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={T.inkFaint}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div style="font-size:12.5px;color:{T.inkMuted};">No listings found for this seller</div>
        </div>
      {:else}
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
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

<style>
  @keyframes ms-spin { from {} to { transform: rotate(360deg); } }
  .ms-spin { animation: ms-spin 0.8s linear infinite; }
</style>
