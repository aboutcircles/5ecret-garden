<script lang="ts">
    import {onMount} from 'svelte';
    import { browser } from '$app/environment';
    import ProductCard from '$lib/areas/market/ui/product/ProductCard.svelte';
    import ProductCardPlaceholder from '$lib/shared/ui/lists/placeholders/ProductCardPlaceholder.svelte';
    import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
    import type { AggregatedCatalogItem } from '$lib/areas/market/model';
    import { goto } from '$app/navigation';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import {gnosisConfig} from "$lib/shared/config/circles";
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = gnosisConfig.production.marketOperator;

    const API_BASE = gnosisConfig.production.marketApiBase;
    const MARKET_CHAIN_ID = gnosisConfig.production.marketChainId ?? 100;
    const SELLERS_CACHE_KEY = `market:sellers:${MARKET_CHAIN_ID}`;
    const SELLERS_CACHE_TTL_MS = 5 * 60 * 1000;

    type ProductLike = AggregatedCatalogItem;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let products: ProductLike[] = $state([]);
    let nextCursor: string | null = $state(null);
    let hasMore: boolean = $state(false);
    let isFetchingNext: boolean = $state(false);
    let nextPagePlaceholders: number = $state(0);

    type SellerListing = { chainId: number; seller: string };
    type SellersResponse = { sellers?: SellerListing[] };
    let sellers: `0x${string}`[] = $state([]);
    let sellersLoaded = $state(false);

    function readCachedSellers(): `0x${string}`[] | null {
      if (!browser) return null;
      try {
        const raw = window.sessionStorage.getItem(SELLERS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { sellers?: string[]; cachedAt?: number };
        const cachedAt = Number(parsed?.cachedAt ?? 0);
        const age = Date.now() - cachedAt;
        if (!Number.isFinite(cachedAt) || age > SELLERS_CACHE_TTL_MS) {
          return null;
        }
        const list = Array.isArray(parsed?.sellers)
          ? parsed.sellers.filter((v) => typeof v === 'string' && v.startsWith('0x'))
          : [];
        return Array.from(new Set(list.map((v) => v.toLowerCase()))) as `0x${string}`[];
      } catch {
        return null;
      }
    }

    function writeCachedSellers(next: `0x${string}`[]): void {
      if (!browser) return;
      try {
        window.sessionStorage.setItem(
          SELLERS_CACHE_KEY,
          JSON.stringify({ sellers: next, cachedAt: Date.now() }),
        );
      } catch {
        // ignore cache write failures
      }
    }

    // Infinite scroll sentinel and observer
    let sentinel: HTMLDivElement | null = $state(null);
    let io: IntersectionObserver | null = null;
    let observed: Element | null = null;

    // Reactively (un)observe the sentinel when it changes or when hasMore toggles
    $effect(() => {
      if (!io) return;
      const target = hasMore ? sentinel : null;
      if (observed && observed !== target) {
        io.unobserve(observed);
        observed = null;
      }
      if (target && observed !== target) {
        io.observe(target);
        observed = target;
      }
    });

    import { shortenAddress } from '$lib/shared/utils/shared';
    const shortAddr = (a?: string) => (a ? shortenAddress(a as any) : '');

    const PAGE_SIZE = 20;

    // ————————————————————————————————————————————
    // Operators tabs (API supports one operator at a time)
    // Currently fixed to the default operator.
    // ————————————————————————————————————————————
    function getScanOperators(): `0x${string}`[] {
      return [gnosisConfig.production.marketOperator as `0x${string}`];
    }

    // Cache operator list for the current render to avoid recomputing in the template
    let scanOperators: `0x${string}`[] = $derived(getScanOperators());

    let selectedOperator: `0x${string}` | null = $state(null);

    // Keep selection valid when avatar changes or settings change (by re-evaluating list on demand)
    $effect(() => {
      const ops = scanOperators;
      if (!ops || ops.length === 0) {
        selectedOperator = gnosisConfig.production.marketOperator as `0x${string}`;
        return;
      }
      if (!selectedOperator || !ops.includes(selectedOperator)) {
        selectedOperator = ops[0];
      }
    });

    // Reload when operator changes
    $effect(() => {
      const op = selectedOperator;
      if (!op) return;
      void loadFirstPage(true);
    });

    // ————————————————————————————————————————————
    // data load with pagination
    // ————————————————————————————————————————————
    const avatarAddress = $derived((avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '') as `0x${string}` | '');
    function getScanAvatars(): `0x${string}`[] {
      return sellers;
    }

    function getMarketApiBase(): string {
      const base = String(API_BASE ?? '').trim();
      if (!base) {
        throw new Error('Market API base is not configured.');
      }
      return base.replace(/\/$/, '');
    }

    async function loadSellers(): Promise<void> {
      if (sellersLoaded) return;

      const cached = readCachedSellers();
      if (cached) {
        sellers = cached;
        sellersLoaded = true;
        return;
      }

      let list: SellerListing[] = [];
      try {
          const url = `${getMarketApiBase()}/api/sellers`;
          const res = await fetch(url, {method: 'GET', headers: {Accept: 'application/json'}});

          if (!res.ok) {
              const text = await res.text().catch(() => '');
              throw new Error(`Failed to load sellers (${res.status}): ${text || res.statusText}`);
          }

          const body = (await res.json().catch(() => null)) as SellerListing[] | SellersResponse | null;
          list = (Array.isArray(body)
              ? body
              : (body && Array.isArray((body as SellersResponse).sellers) ? (body as SellersResponse).sellers : [])) ?? [];
      } catch (err) {
          list = [{
              chainId: 100,
              seller: "0x943186fbcfd74fd575bcf9aa76a53f56b2f06aba"
          }];
      }

      const filtered = list
        .map((entry) => ({
          chainId: Number((entry as SellerListing).chainId),
          seller: String((entry as SellerListing).seller ?? ''),
        }))
        .filter((entry) => Number.isFinite(entry.chainId) && entry.seller)
        .filter((entry) => entry.chainId === MARKET_CHAIN_ID)
        .map((entry) => entry.seller.toLowerCase());

      sellers = Array.from(new Set(filtered)) as `0x${string}`[];
      sellersLoaded = true;
      writeCachedSellers(sellers);
    }

    async function loadFirstPage(keepProducts: boolean = false): Promise<void> {
      loading = true;
      errorMsg = '';
      if (!keepProducts) {
        products = [];
      }
      nextCursor = null;
      hasMore = false;

      try {
        await loadSellers();
        const avatars = getScanAvatars();
        if (avatars.length === 0) {
          products = [];
          nextCursor = null;
          hasMore = false;
          return;
        }
        const op = (selectedOperator ?? (gnosisConfig.production.marketOperator as `0x${string}`)) as `0x${string}`;
        const catalog = getMarketClient().catalog.forOperator(op);
        const page = await catalog.fetchCatalogPage({ avatars, pageSize: PAGE_SIZE, chainId: MARKET_CHAIN_ID });
        products = page.items;
        nextCursor = page.nextCursor;
        hasMore = !!nextCursor;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
        errorMsg = msg;
      } finally {
        loading = false;
      }
    }

    async function loadNextPage(): Promise<void> {
      if (!nextCursor || loading || isFetchingNext) return;
      loading = true;
      isFetchingNext = true;
      nextPagePlaceholders = Math.max(1, Math.min(PAGE_SIZE, 24));
      errorMsg = '';
      try {
        const op = (selectedOperator ?? (gnosisConfig.production.marketOperator as `0x${string}`)) as `0x${string}`;
        const catalog = getMarketClient().catalog.forOperator(op);
        const page = await catalog.fetchCatalogPage({ avatars: getScanAvatars(), pageSize: PAGE_SIZE, chainId: MARKET_CHAIN_ID, cursor: nextCursor });
        products = products.concat(page.items);
        nextCursor = page.nextCursor;
        hasMore = !!nextCursor;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
        // Treat 416 as end-of-results if bubbled
        if (msg.includes('416')) {
          hasMore = false;
        } else {
          errorMsg = msg;
        }
      } finally {
        loading = false;
        isFetchingNext = false;
        nextPagePlaceholders = 0;
      }
    }

    onMount(() => {
      // Initialize IntersectionObserver for infinite scroll
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            // Guard with `loading` and `hasMore` to avoid duplicate fetches
            if (!loading && hasMore) {
              void loadNextPage();
            }
          }
        }
      }, { root: null, rootMargin: '600px 0px 600px 0px', threshold: 0 });

      // initial load is triggered by selectedOperator effect
      // void loadFirstPage();

      return () => {
        if (io) {
          try {
            if (observed) io.unobserve(observed);
          } catch {}
          try {
            io.disconnect();
          } catch {}
          io = null;
          observed = null;
        }
      };
    });


</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
    <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

        <!-- Page title -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 14px;">
            <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
                <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">Market</span>
                <span style="font-size:12.5px;color:{T.inkMuted};">{products.length}{hasMore ? '+' : ''} offers · {shortAddr(selectedOperator ?? OPERATOR)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <button
                    onclick={() => goto('/settings?tab=marketplace')}
                    style="
                        height:40px;padding:0 14px;border-radius:9999px;
                        background:{T.surface};color:{T.ink};border:1px solid {T.hairline};cursor:pointer;
                        display:inline-flex;align-items:center;gap:6px;
                        font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                        box-shadow:{T.shadow.xs};
                    "
                    class="hidden md:inline-flex"
                >
                    Manage offers
                </button>
                <button
                    onclick={() => goto('/settings?tab=marketplace')}
                    style="
                        height:40px;padding:0 14px;border-radius:9999px;
                        background:{T.primary};color:#fff;border:0;cursor:pointer;
                        display:inline-flex;align-items:center;gap:6px;
                        font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                        box-shadow:0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(15,10,30,0.12);
                    "
                >
                    <Icon name="plus" size={15} stroke="#fff" strokeWidth={2.0} />
                    Post offer
                </button>
            </div>
        </div>

        <!-- Body -->
        {#if loading && products.length === 0}
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {#each Array(6) as _, i}
                    <div style="border-radius:18px;background:{T.surface};border:1px solid {T.hairlineSoft};overflow:hidden;" class="animate-pulse">
                        <div style="height:140px;background:{T.pageDeep};"></div>
                        <div style="padding:14px;">
                            <div style="height:14px;width:75%;background:{T.pageDeep};border-radius:6px;margin-bottom:6px;"></div>
                            <div style="height:11px;width:45%;background:{T.pageDeep};border-radius:5px;"></div>
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:14px;border-top:1px solid {T.hairlineSoft};">
                                <div style="height:16px;width:35%;background:{T.pageDeep};border-radius:6px;"></div>
                                <div style="height:28px;width:54px;background:{T.pageDeep};border-radius:9999px;"></div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else if errorMsg}
            <div style="
                padding:14px 16px;border-radius:14px;
                background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.15);color:{T.negative};
                font-size:13.5px;
            ">
                <b>Failed to load:</b> {errorMsg}
            </div>
        {:else if products.length === 0}
            <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:32px 16px;text-align:center;">
                <span style="font-size:13.5px;color:{T.inkMuted};">No offers yet</span>
            </div>
        {:else}
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" data-sveltekit-preload-data="hover">
                {#each products as p (p.productCid)}
                    <ProductCard
                        product={p}
                        showSellerInfo={true}
                        ondeleted={() => loadFirstPage()}
                    />
                {/each}
                {#if nextPagePlaceholders > 0}
                    {#each Array.from({ length: nextPagePlaceholders }) as _, i}
                        <ProductCardPlaceholder />
                    {/each}
                {/if}
            </div>
            {#if hasMore}
                <div bind:this={sentinel} class="h-2 w-full"></div>
                <div style="display:flex;justify-content:center;margin-top:18px;">
                    <button
                        onclick={loadNextPage}
                        disabled={loading}
                        style="
                            height:38px;padding:0 18px;border-radius:9999px;
                            background:{T.surface};color:{T.inkBody};border:1px solid {T.hairline};cursor:pointer;
                            font-family:{T.fontSans};font-size:13px;font-weight:540;
                            opacity:{loading ? 0.5 : 1};
                        "
                    >
                        {loading ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            {/if}
        {/if}

        <div style="height:24px;"></div>
    </div>
</div>
