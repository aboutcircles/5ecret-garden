<script lang="ts">
    import { browser } from '$app/environment';
    import ProductCard from '$lib/areas/market/ui/product/ProductCard.svelte';
    import ProductCardPlaceholder from '$lib/shared/ui/lists/placeholders/ProductCardPlaceholder.svelte';
    import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
    import type { AggregatedCatalogItem } from '$lib/areas/market/model';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import {gnosisConfig} from "$lib/shared/config/circles";
    import { getActiveConfig } from '$lib/shared/state/settings.svelte';
    import { T } from '$lib/design-system/tokens.js';

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = gnosisConfig.production.marketOperator as `0x${string}`;

    const API_BASE = getActiveConfig().marketApiBase;
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

    // Infinite scroll sentinel
    let sentinel: HTMLDivElement | null = $state(null);

    // Observe the sentinel whenever there are more pages to load. The observer is
    // created *inside* this effect so it is wired up as soon as the sentinel is in the
    // DOM and torn down/recreated when `hasMore` or the sentinel changes. (Previously
    // the observer lived in a non-reactive `let` assigned in onMount, while a separate
    // effect tried to observe it — but that effect bailed on `!io` *before* reading its
    // reactive deps, so it captured none and never re-ran once onMount set `io`. Net:
    // the sentinel was never observed and scroll-to-load-more silently did nothing; only
    // the manual "Load more" button worked.)
    $effect(() => {
      const target = hasMore ? sentinel : null;
      if (!target) return;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            // Guard with `loading`/`hasMore` (current values) to avoid duplicate fetches.
            if (e.isIntersecting && !loading && hasMore) void loadNextPage();
          }
        },
        { root: null, rootMargin: '600px 0px 600px 0px', threshold: 0 },
      );
      observer.observe(target);
      return () => observer.disconnect();
    });

    import { shortenAddress } from '$lib/shared/utils/shared';
    const shortAddr = (a?: string) => (a ? shortenAddress(a) : '');

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
    const avatarAddress = $derived((avatarState.avatar?.address ?? '') as `0x${string}` | '');
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
        // Avatars without an operator namespace have no offers — treat as empty, not error
        if (/namespace|not found|404/i.test(msg)) {
          products = [];
        } else {
          errorMsg = msg;
        }
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

    // ————————————————————————————————————————————
    // Grid virtualization (row windowing)
    //
    // Infinite scroll can accumulate hundreds of product cards, and each card mounts a live
    // reactive subtree (ProductViewer + Avatar). Rendering + laying out all of them pins the
    // main thread and freezes the tab (Chrome "page unresponsive"), which a reload only clears
    // temporarily. Cards are uniform height by design (fixed image + line-clamped title +
    // reserved rows), so we window by fixed-height rows: only the rows near the viewport (plus
    // an overscan) are mounted; a spacer container reserves the full scroll height so the
    // scrollbar stays honest. Mirrors the range math in shared/ui/lists/VirtualList.svelte.
    // ————————————————————————————————————————————
    const OVERSCAN_ROWS = 3;
    const DEFAULT_CARD_HEIGHT = 360; // px estimate until the first card is measured
    const MD_BREAKPOINT = '(min-width: 768px)';

    let gridViewportEl: HTMLDivElement | null = $state(null);
    let gridInnerEl: HTMLDivElement | null = $state(null);
    // Seed from matchMedia so the JS column count matches the CSS grid on the first paint
    // (md:grid-cols-3 at ≥768px), instead of briefly assuming 2 on a desktop viewport.
    let cols = $state(
      typeof window !== 'undefined' && window.matchMedia(MD_BREAKPOINT).matches ? 3 : 2
    );
    let cardHeight = $state(0);
    let rangeStartRow = $state(0);
    let rangeEndRow = $state(6); // seed a first paint so the initial cards can be measured

    const rowGap = $derived(cols >= 3 ? 16 : 12); // gap-3 (12px) / md:gap-4 (16px)
    const rowHeight = $derived((cardHeight || DEFAULT_CARD_HEIGHT) + rowGap);
    const totalRows = $derived(Math.ceil(products.length / cols));
    const totalHeight = $derived(Math.max(0, totalRows * rowHeight - rowGap));
    const visibleStartIndex = $derived(rangeStartRow * cols);
    const visibleEndIndex = $derived(Math.min(products.length, rangeEndRow * cols));
    const visibleProducts = $derived(products.slice(visibleStartIndex, visibleEndIndex));
    const offsetTop = $derived(rangeStartRow * rowHeight);

    function findScrollRoot(el: HTMLElement | null): HTMLElement | null {
      if (!el || typeof window === 'undefined') return null;
      let node: HTMLElement | null = el.parentElement;
      while (node) {
        const oy = window.getComputedStyle(node).overflowY;
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return node;
        node = node.parentElement;
      }
      return null;
    }

    function measureCardHeight(): void {
      if (!gridInnerEl) return;
      const first = gridInnerEl.querySelector('.product-card-root') as HTMLElement | null;
      const h = first?.getBoundingClientRect().height ?? 0;
      // Keep rowHeight synced to the REAL card height rather than locking the first reading: the
      // first measurement can land while the seller avatar is still a taller loading skeleton,
      // and card height differs slightly across the 2↔3 column breakpoint. Update whenever it
      // meaningfully changes (≥1px); converges once avatars resolve and layout settles.
      if (h > 0 && Math.abs(h - cardHeight) >= 1) cardHeight = h;
    }

    function updateRange(): void {
      if (!gridViewportEl || typeof window === 'undefined') return;
      measureCardHeight();
      const root = findScrollRoot(gridViewportEl);
      const rootTop = root ? root.getBoundingClientRect().top : 0;
      const rootHeight = root ? root.clientHeight : window.innerHeight;
      const gridTop = gridViewportEl.getBoundingClientRect().top;
      // How far the top of the grid has scrolled above the top of the scroll viewport.
      const scrolledPast = Math.max(0, rootTop - gridTop);
      const firstRow = Math.floor(scrolledPast / rowHeight) - OVERSCAN_ROWS;
      const rowsInView = Math.ceil(rootHeight / rowHeight) + OVERSCAN_ROWS * 2;
      // Clamp start to totalRows: a breakpoint change (cols shrinking the row count) while
      // scrolled deep can push the pixel-derived start past the new last row; without this,
      // rangeEndRow < rangeStartRow yields an empty slice → a transient blank grid until the
      // next scroll/resize event recomputes.
      const start = Math.min(Math.max(0, firstRow), totalRows);
      rangeStartRow = start;
      rangeEndRow = Math.min(totalRows, start + rowsInView);
    }

    function syncCols(): void {
      cols = typeof window !== 'undefined' && window.matchMedia(MD_BREAKPOINT).matches ? 3 : 2;
    }

    // Attach scroll/resize listeners to the actual scroll root once the grid is mounted.
    $effect(() => {
      if (!gridViewportEl || typeof window === 'undefined') return;
      const root = findScrollRoot(gridViewportEl);
      const scrollTarget: HTMLElement | Window = root ?? window;
      const onScroll = () => updateRange();
      const onResize = () => {
        syncCols();
        updateRange();
      };
      scrollTarget.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      updateRange();
      return () => {
        scrollTarget.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      };
    });

    // Track the responsive column count (must match the CSS grid's md:grid-cols-3 breakpoint).
    $effect(() => {
      if (typeof window === 'undefined') return;
      const mql = window.matchMedia(MD_BREAKPOINT);
      syncCols();
      const onChange = () => {
        syncCols();
        updateRange();
      };
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    });

    // Re-measure the card height whenever the rendered cards resize (seller avatars resolving
    // from skeleton to final height, or the 2↔3 column breakpoint changing card width) so the
    // fixed row height stays accurate and windowed rows don't drift out of alignment.
    $effect(() => {
      if (!gridInnerEl || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => measureCardHeight());
      ro.observe(gridInnerEl);
      return () => ro.disconnect();
    });

    // Recompute the visible window when the dataset, column count, or row height changes —
    // e.g. after each infinite-scroll page load or a card-height re-measure. Deliberately does
    // NOT read visibleProducts (which it derives via the range it writes) to avoid a
    // self-triggering effect.
    $effect(() => {
      void products.length;
      void cols;
      void rowHeight;
      updateRange();
    });



</script>

<!-- Shared Market header + sub-nav live in +layout.svelte; this page renders the Browse grid. -->
<div style="padding:0 18px 24px;" class="md:!px-9 md:!pb-9 md:max-w-[1280px] md:mx-auto">

        <!-- Browse-specific offers count -->
        <div style="padding:0 0 14px;">
            <span style="font-size:12.5px;color:{T.inkMuted};">{products.length}{hasMore ? '+' : ''} offers available</span>
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
                padding:18px 16px;border-radius:14px;
                background:{T.surface};border:1px solid rgba(196,68,48,0.2);
                display:flex;flex-direction:column;gap:10px;align-items:flex-start;
            ">
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <span style="font-size:13.5px;font-weight:580;color:{T.ink};">Couldn't load offers</span>
                    <span style="font-size:12px;color:{T.inkMuted};">{errorMsg}</span>
                </div>
                <button type="button" onclick={() => loadFirstPage()} style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:12.5px;font-weight:540;cursor:pointer;">Retry</button>
            </div>
        {:else if products.length === 0}
            <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:32px 16px;text-align:center;">
                <span style="font-size:13.5px;color:{T.inkMuted};">No offers yet</span>
            </div>
        {:else}
            <!-- Windowed grid: only the rows near the viewport are mounted; the outer container
                 reserves the full scroll height so the scrollbar and infinite-scroll sentinel
                 stay correctly positioned. -->
            <div bind:this={gridViewportEl} style="position:relative;height:{totalHeight}px;">
                <div
                    bind:this={gridInnerEl}
                    class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4"
                    style="position:absolute;top:{offsetTop}px;left:0;right:0;"
                    data-sveltekit-preload-data="hover"
                >
                    {#each visibleProducts as p (p.productCid)}
                        <ProductCard
                            product={p}
                            showSellerInfo={true}
                            ondeleted={() => loadFirstPage()}
                        />
                    {/each}
                </div>
            </div>
            {#if nextPagePlaceholders > 0}
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                    {#each Array.from({ length: nextPagePlaceholders }) as _, i}
                        <ProductCardPlaceholder />
                    {/each}
                </div>
            {/if}
            {#if hasMore}
                <div bind:this={sentinel} class="h-2 w-full"></div>
                <div style="display:flex;justify-content:center;margin-top:18px;">
                    <button
                        onclick={loadNextPage}
                        disabled={loading}
                        aria-busy={loading}
                        style="
                            height:38px;padding:0 18px;border-radius:9999px;
                            background:{T.surface};color:{T.inkBody};border:1px solid {T.hairline};
                            cursor:{loading ? 'not-allowed' : 'pointer'};
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
