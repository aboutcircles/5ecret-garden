<script lang="ts">
    import { onDestroy, type Component } from 'svelte';
    import type { EventRow, TransactionHistoryRow } from '@circles-sdk/data';
    import { getKeyFromItem } from '$lib/shared/state/query';
    import type { Readable } from 'svelte/store';

    interface ListStoreValue<T = EventRow | TransactionHistoryRow> {
        data: T[];
        next: () => Promise<boolean>;
        ended: boolean;
        error?: string | null;
    }

    interface Props<T extends Record<string, any> = any> {
        store: Readable<ListStoreValue<T>>;
        row: Component<T>;
        placeholderRow?: Component<{ height?: number; index?: number }>;
        getKey?: (item: T) => string;
        // Approximate row height for placeholder sizing (px). Keep in sync with real row.
        rowHeight?: number;
        // Maximum number of eager placeholder pages to render ahead (1–2 recommended)
        maxPlaceholderPages?: number;
        // Expected number of items loaded per page (per next() call)
        expectedPageSize?: number;
    }

    let {
        store,
        row,
        getKey = (getKeyFromItem as unknown as (item: any) => string),
        placeholderRow,
        rowHeight = 64,
        maxPlaceholderPages = 2,
        expectedPageSize
    }: Props = $props();

    let observer: IntersectionObserver | null = null;
    let anchor: HTMLElement | undefined = $state();

    let localError = $state<string | null>(null);
    let isLoadingNext = $state(false);

    const storeError = $derived<string | null>(($store as any)?.error ?? null);
    const displayError = $derived<string | null>(storeError ?? localError);
    const hasError = $derived<boolean>(!!displayError);

    // Number of placeholder "pages" currently staged
    let stagedPlaceholders = $state(0);
    // Size of a single placeholder page in rows, computed lazily once
    let placeholderPageSize = $state(0);

    const totalPlaceholders = $derived(stagedPlaceholders);

    function computePlaceholderPageSize(): number {
        const isBrowser = typeof window !== 'undefined';
        const viewportHeight = isBrowser ? window.innerHeight : 700;

        const approxRowsPerViewport = Math.ceil(viewportHeight / rowHeight) + 4;
        const cappedByViewport = Math.min(30, approxRowsPerViewport);

        const hasExpectedPageSize = typeof expectedPageSize === 'number' && expectedPageSize > 0;

        if (!hasExpectedPageSize) {
            // Fallback: original behaviour (capped by viewport / 30)
            return cappedByViewport;
        }

        // Ensure we always stage strictly fewer placeholders than real items per page.
        // This guarantees that once a full page of real items is rendered,
        // the total list height increases and tends to push the sentinel out of view.
        const maxByPage = Math.max(1, expectedPageSize - 1);

        const effectiveSize = Math.min(cappedByViewport, maxByPage);

        return effectiveSize;
    }

    function ensurePlaceholderPageSize(): number {
        const isInitialised = placeholderPageSize > 0;

        if (isInitialised) {
            return placeholderPageSize;
        }

        const size = computePlaceholderPageSize();
        placeholderPageSize = size;

        return placeholderPageSize;
    }

    function enqueuePlaceholderPage(): void {
        const size = ensurePlaceholderPageSize();
        const effectiveMax = maxPlaceholderPages ?? 2;
        const maxPlaceholders = effectiveMax * size;

        stagedPlaceholders = Math.min(maxPlaceholders, stagedPlaceholders + size);
    }

    const RUNWAY_FLOOR = 1;

    function clearPlaceholdersAfterLoad(addedCount: number): void {
        if (addedCount <= 0) {
            clearAllPlaceholderPages();
            return;
        }

        const spent = Math.min(stagedPlaceholders, addedCount);
        const remaining = stagedPlaceholders - spent;
        stagedPlaceholders = Math.max(RUNWAY_FLOOR, remaining);
    }

    function clearAllPlaceholderPages(): void {
        stagedPlaceholders = 0;
    }

    async function loadNextPage(): Promise<void> {
        const storeValue = $store;

        const canLoad =
            !!storeValue &&
            !storeValue.ended &&
            !isLoadingNext;

        if (!canLoad) {
            return;
        }

        const beforeLength = storeValue?.data?.length ?? 0;

        isLoadingNext = true;
        enqueuePlaceholderPage();

        try {
            await storeValue.next();
            const afterLength = $store?.data?.length ?? beforeLength;
            const addedCount = Math.max(0, afterLength - beforeLength);
            clearPlaceholdersAfterLoad(addedCount);
            localError = null;
        } catch (e) {
            console.debug('[list] load next page failed', e);
            // On error, remove all placeholders and show error state
            clearAllPlaceholderPages();
            localError = 'Error loading items';
        } finally {
            isLoadingNext = false;
            if (anchor && observer && !$store?.ended) {
                requestAnimationFrame(() => observer?.observe(anchor));
            }
        }
    }

    const handleIntersection: IntersectionObserverCallback = (entries) => {
        const hit = entries.some((entry) => entry.isIntersecting);

        if (!hit) {
            return;
        }

        const shouldLoadNext =
            hit &&
            !$store?.ended &&
            !hasError &&
            !isLoadingNext;

        if (!shouldLoadNext) {
            return;
        }

        observer?.unobserve(anchor as HTMLElement);
        void loadNextPage();
    };

    const setupObserver = (): void => {
        const storeValue = $store;

        const canObserve =
            !!anchor &&
            !!storeValue &&
            !storeValue.ended;

        if (!canObserve) {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            return;
        }

        if (!observer) {
            observer = new IntersectionObserver(handleIntersection, { rootMargin: '400px 0px' });
        } else {
            observer.disconnect();
        }

        observer.observe(anchor as HTMLElement);
    };

    const handleRetry = async (): Promise<void> => {
        await loadNextPage();
    };

    $effect(() => {
        if (store && anchor) {
            setupObserver();
        }
    });

    // When the store reports "ended", clear placeholders and stop observing
    $effect(() => {
        if ($store?.ended) {
            clearAllPlaceholderPages();
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }
    });


    onDestroy(() => {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    });
</script>

<div class="generic-list w-full flex flex-col gap-y-1.5 py-2" role="list">
    {#each $store?.data ?? [] as item (getKey(item))}
        <div data-list-row>
            <svelte:component this={row} {item} />
        </div>
    {/each}

    {#if totalPlaceholders > 0}
        {#each Array.from({ length: totalPlaceholders }) as _, i}
            {#if placeholderRow}
                {@const Placeholder = placeholderRow}
                <Placeholder height={rowHeight} index={i} />
            {:else}
                <div class="skeleton-row" aria-hidden="true" style={`height: ${rowHeight}px`}>
                    <div class="sk-row">
                        <div class="sk-avatar"></div>
                        <div class="sk-lines">
                            <div class="sk-line sk-line-1"></div>
                            <div class="sk-line sk-line-2"></div>
                        </div>
                        <div class="sk-amount"></div>
                    </div>
                </div>
            {/if}
        {/each}
    {/if}

    <div
            class="text-center py-4"
            bind:this={anchor}
            aria-live="polite"
            aria-busy={$store && !$store?.ended && !hasError ? 'true' : 'false'}
    >
        {#if $store?.ended}
            {#if ($store?.data ?? []).length > 0}
                <span class="text-base-content/70">No more items</span>
            {/if}
        {:else if hasError}
            <span class="text-error">{String(displayError ?? 'Error loading items')}</span>
            <button class="ml-2 link link-primary" onclick={handleRetry}>Retry</button>
        {:else}
            <span class="loading loading-spinner text-primary"></span>
            <span class="ml-2 text-base-content/70">Loading more...</span>
        {/if}
    </div>
</div>

<style>
    .generic-list,
    .generic-list * {
        overflow-anchor: none;
    }

    .skeleton-row {
        border-radius: 12px;
        /* Transparent background as requested (no grey panel background) */
        background: transparent;
        position: relative;
        overflow: hidden;
        padding: 8px 12px;
        display: block;
    }
    .sk-row {
        height: 100%;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 12px;
    }
    .sk-avatar {
        width: 40px;
        height: 40px;
        border-radius: 9999px;
        background: color-mix(in oklab, currentColor 18%, transparent);
    }
    .sk-lines {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
    }
    .sk-line {
        height: 10px;
        border-radius: 8px;
        background: color-mix(in oklab, currentColor 16%, transparent);
    }
    .sk-line-1 {
        width: 56%;
    }
    .sk-line-2 {
        width: 36%;
    }
    .sk-amount {
        width: 68px;
        height: 14px;
        border-radius: 8px;
        background: color-mix(in oklab, currentColor 22%, transparent);
    }
    @media (prefers-reduced-motion: no-preference) {
        .skeleton-row::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
            transform: translateX(-100%);
            animation: shimmer 1.1s infinite;
            pointer-events: none;
        }
        @keyframes shimmer {
            100% {
                transform: translateX(100%);
            }
        }
    }
</style>
