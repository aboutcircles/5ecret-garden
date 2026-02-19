<script lang="ts">
    import { onDestroy, setContext, tick, type Component } from 'svelte';
    import { getKeyFromItem } from '$lib/shared/state/query/circlesQueryStore';
    import type { Readable } from 'svelte/store';
    import {
        VIRTUAL_LIST_CONTEXT_KEY,
        type VirtualListController,
    } from '$lib/shared/ui/lists/utils/virtualListContext';

    interface ListStoreValue<T = Record<string, any>> {
        data: T[];
        next: () => Promise<boolean>;
        ended: boolean;
        error?: string | null;
    }

    interface Props<T extends Record<string, any> = any> {
        store: Readable<ListStoreValue<T>>;
        row: Component<{ item: T }>;
        placeholderRow?: Component<{ height?: number; index?: number }>;
        getKey?: (item: T) => string;
        rowHeight?: number;
        maxPlaceholderPages?: number;
        expectedPageSize?: number;
        eagerLoadMultiplier?: number;
        overscan?: number;
    }

    let {
        store,
        row,
        getKey = (getKeyFromItem as unknown as (item: any) => string),
        placeholderRow,
        rowHeight = 64,
        maxPlaceholderPages = 2,
        expectedPageSize,
        eagerLoadMultiplier = 2,
        overscan = 8,
    }: Props = $props();

    let listEl: HTMLElement | undefined = $state();
    let localError = $state<string | null>(null);
    let isLoadingNext = $state(false);

    const storeError = $derived<string | null>(($store as any)?.error ?? null);
    const displayError = $derived<string | null>(storeError ?? localError);
    const hasError = $derived<boolean>(!!displayError);

    let stagedPlaceholders = $state(0);
    let placeholderPageSize = $state(0);

    const totalPlaceholders = $derived(stagedPlaceholders);
    const loadedItems = $derived($store?.data ?? []);
    const totalCount = $derived(loadedItems.length + totalPlaceholders);

    let rangeStart = $state(0);
    let rangeEnd = $state(0);

    const totalHeight = $derived(Math.max(0, totalCount * rowHeight));

    type VirtualRow =
        | { kind: 'item'; index: number; top: number; item: any }
        | { kind: 'placeholder'; index: number; top: number; placeholderIndex: number };

    const virtualRows = $derived.by((): VirtualRow[] => {
        const start = Math.max(0, Math.min(totalCount, rangeStart));
        const end = Math.max(start, Math.min(totalCount, rangeEnd));
        const out: VirtualRow[] = [];

        for (let i = start; i < end; i += 1) {
            const top = i * rowHeight;
            if (i < loadedItems.length) {
                out.push({ kind: 'item', index: i, top, item: loadedItems[i] });
            } else {
                out.push({ kind: 'placeholder', index: i, top, placeholderIndex: i - loadedItems.length });
            }
        }

        return out;
    });

    function computePlaceholderPageSize(): number {
        const isBrowser = typeof window !== 'undefined';
        const viewportHeight = isBrowser ? window.innerHeight : 700;
        const approxRowsPerViewport = Math.ceil(viewportHeight / rowHeight) + 4;
        const cappedByViewport = Math.min(30, approxRowsPerViewport);

        const hasExpectedPageSize = typeof expectedPageSize === 'number' && expectedPageSize > 0;
        if (!hasExpectedPageSize) return cappedByViewport;

        const maxByPage = Math.max(1, expectedPageSize - 1);
        return Math.min(cappedByViewport, maxByPage);
    }

    function ensurePlaceholderPageSize(): number {
        if (placeholderPageSize > 0) return placeholderPageSize;
        placeholderPageSize = computePlaceholderPageSize();
        return placeholderPageSize;
    }

    function enqueuePlaceholderPage(): void {
        const size = ensurePlaceholderPageSize();
        const maxPlaceholders = (maxPlaceholderPages ?? 2) * size;
        stagedPlaceholders = Math.min(maxPlaceholders, stagedPlaceholders + size);
    }

    const RUNWAY_FLOOR = 1;

    function clearPlaceholdersAfterLoad(addedCount: number, storeEnded: boolean): void {
        if (storeEnded) {
            stagedPlaceholders = 0;
            return;
        }
        if (addedCount <= 0) {
            stagedPlaceholders = Math.max(RUNWAY_FLOOR, stagedPlaceholders);
            return;
        }

        const spent = Math.min(stagedPlaceholders, addedCount);
        const remaining = stagedPlaceholders - spent;
        stagedPlaceholders = Math.max(RUNWAY_FLOOR, remaining);
    }

    function findScrollRoot(el: HTMLElement | undefined): Element | null {
        if (!el || typeof window === 'undefined') return null;

        let node: HTMLElement | null = el.parentElement;
        while (node) {
            const style = window.getComputedStyle(node);
            const overflowY = style.overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
                return node;
            }
            node = node.parentElement;
        }

        return null;
    }

    function scrollToIndex(index: number): void {
        if (!listEl || typeof window === 'undefined') return;

        const clamped = Math.max(0, Math.min(totalCount - 1, index));
        const root = findScrollRoot(listEl);
        const listRect = listEl.getBoundingClientRect();
        const rowTopInList = clamped * rowHeight;
        const rowBottomInList = rowTopInList + rowHeight;

        const computeJumpScrollTop = (
            viewportTop: number,
            viewportHeight: number,
            rowTop: number,
            rowBottom: number,
        ): number | null => {
            // "regular list" feel: when focus reaches an edge band,
            // jump a chunk so the focused row lands around the middle.
            const edgeBand = Math.max(rowHeight * 2, Math.floor(viewportHeight * 0.15));
            const targetOffset = Math.floor(viewportHeight * 0.45);

            const nearTop = rowTop < viewportTop + edgeBand;
            const nearBottom = rowBottom > viewportTop + viewportHeight - edgeBand;

            if (!nearTop && !nearBottom) {
                return null;
            }

            return Math.max(0, rowTop - targetOffset);
        };

        if (!root) {
            const viewportTop = window.scrollY;
            const viewportHeight = window.innerHeight;
            const rowTop = window.scrollY + listRect.top + rowTopInList;
            const rowBottom = window.scrollY + listRect.top + rowBottomInList;

            const nextScrollTop = computeJumpScrollTop(viewportTop, viewportHeight, rowTop, rowBottom);
            if (nextScrollTop !== null) {
                window.scrollTo({ top: nextScrollTop });
            }
            return;
        }

        const rootEl = root as HTMLElement;
        const rootRect = rootEl.getBoundingClientRect();
        const listOffsetInRoot = listRect.top - rootRect.top;

        const rowTop = rootEl.scrollTop + listOffsetInRoot + rowTopInList;
        const rowBottom = rootEl.scrollTop + listOffsetInRoot + rowBottomInList;

        const viewportTop = rootEl.scrollTop;
        const viewportHeight = rootEl.clientHeight;

        const nextScrollTop = computeJumpScrollTop(viewportTop, viewportHeight, rowTop, rowBottom);
        if (nextScrollTop !== null) {
            rootEl.scrollTop = nextScrollTop;
        }
    }

    function focusIndex(index: number): void {
        if (!listEl) return;
        const rows = loadedItems.length;
        if (rows <= 0) return;
        const clamped = Math.max(0, Math.min(rows - 1, index));

        // Ensure target index is inside the rendered virtual window before focus lookup.
        const start = Math.max(0, clamped - overscan);
        const end = Math.min(totalCount, clamped + overscan + 1);
        rangeStart = start;
        rangeEnd = Math.max(end, start + 1);

        scrollToIndex(clamped);
        updateRange();

        let attempts = 0;
        const tryFocus = () => {
            if (!listEl) return;

            const rowContainer = listEl.querySelector<HTMLElement>(`[data-virtual-index="${clamped}"]`);
            const focusable =
                rowContainer?.querySelector<HTMLElement>('[data-list-row-focusable]')
                ?? rowContainer?.querySelector<HTMLElement>('[tabindex="0"]')
                ?? rowContainer?.querySelector<HTMLElement>('[role="button"]')
                ?? rowContainer;

            if (focusable) {
                focusable.focus({ preventScroll: true });
                return;
            }

            attempts += 1;
            if (attempts < 3) {
                requestAnimationFrame(tryFocus);
            }
        };

        requestAnimationFrame(tryFocus);
    }

    const controller: VirtualListController = {
        focusIndex,
        rowCount: () => loadedItems.length,
    };
    setContext(VIRTUAL_LIST_CONTEXT_KEY, controller);

    function updateRange(): void {
        if (!listEl || typeof window === 'undefined') return;

        const listRect = listEl.getBoundingClientRect();
        const root = findScrollRoot(listEl);
        const rootRect = root
            ? (root as HTMLElement).getBoundingClientRect()
            : ({ top: 0, bottom: window.innerHeight } as Pick<DOMRect, 'top' | 'bottom'>);

        const visibleTop = Math.max(rootRect.top, listRect.top);
        const visibleBottom = Math.min(rootRect.bottom, listRect.bottom);

        if (visibleBottom <= visibleTop) {
            rangeStart = 0;
            rangeEnd = Math.min(totalCount, Math.max(1, overscan * 2));
            return;
        }

        const startPx = Math.max(0, visibleTop - listRect.top);
        const endPx = Math.max(startPx, visibleBottom - listRect.top);

        const rawStart = Math.floor(startPx / rowHeight);
        const rawEndExclusive = Math.ceil(endPx / rowHeight);

        rangeStart = Math.max(0, rawStart - overscan);
        rangeEnd = Math.min(totalCount, rawEndExclusive + overscan);
    }

    async function loadNextPage(): Promise<void> {
        const storeValue = $store;
        if (!storeValue || storeValue.ended || isLoadingNext) return;

        const beforeLength = storeValue.data?.length ?? 0;
        isLoadingNext = true;
        enqueuePlaceholderPage();

        try {
            await tick();
            if (typeof requestAnimationFrame !== 'undefined') {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
                });
            }

            await storeValue.next();

            const afterLength = $store?.data?.length ?? beforeLength;
            const addedCount = Math.max(0, afterLength - beforeLength);
            clearPlaceholdersAfterLoad(addedCount, $store?.ended ?? false);
            localError = null;
        } catch (e) {
            console.debug('[virtual-list] load next page failed', e);
            stagedPlaceholders = 0;
            localError = 'Error loading items';
        } finally {
            isLoadingNext = false;
            updateRange();
        }
    }

    function maybePrefetchNext(): void {
        if (!$store || $store.ended || hasError || isLoadingNext) return;

        const dataLength = loadedItems.length;
        if (dataLength === 0) {
            void loadNextPage();
            return;
        }

        const endDataIndex = Math.min(dataLength - 1, Math.max(0, rangeEnd - 1));
        const remaining = (dataLength - 1) - endDataIndex;
        const runway = Math.max(3, Math.floor(ensurePlaceholderPageSize() * eagerLoadMultiplier));

        if (remaining <= runway) {
            void loadNextPage();
        }
    }

    function setupListeners(): () => void {
        if (!listEl || typeof window === 'undefined') return () => {};

        const root = findScrollRoot(listEl) as HTMLElement | null;
        const target: HTMLElement | Window = root ?? window;
        const onScroll = () => {
            updateRange();
            maybePrefetchNext();
        };
        const onResize = () => {
            updateRange();
            maybePrefetchNext();
        };

        target.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });

        updateRange();
        maybePrefetchNext();

        return () => {
            target.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }

    let cleanupListeners: (() => void) | null = null;

    $effect(() => {
        cleanupListeners?.();
        cleanupListeners = null;

        if (listEl) {
            cleanupListeners = setupListeners();
        }
    });

    $effect(() => {
        const storeValue = $store;
        if (!storeValue) return;

        const isEmpty = (storeValue.data ?? []).length === 0;
        if (isEmpty && !storeValue.ended && !isLoadingNext && stagedPlaceholders === 0) {
            enqueuePlaceholderPage();
        }

        if (storeValue.ended) {
            stagedPlaceholders = 0;
        }

        updateRange();
        maybePrefetchNext();
    });

    const handleRetry = async (): Promise<void> => {
        await loadNextPage();
    };

    onDestroy(() => {
        cleanupListeners?.();
        cleanupListeners = null;
    });
</script>

<div class="generic-list virtual-list w-full py-2" role="list" bind:this={listEl}>
    <div class="virtual-space" style={`height: ${totalHeight}px`}>
        {#each virtualRows as vr (vr.kind === 'item' ? getKey(vr.item) : `placeholder-${vr.placeholderIndex}`)}
            <div
                class="virtual-row"
                data-virtual-index={vr.index}
                style={`transform: translateY(${vr.top}px); height: ${rowHeight}px`}
            >
                {#if vr.kind === 'item'}
                    {@const Row = row}
                    <div data-list-row>
                        <Row item={vr.item} />
                    </div>
                {:else}
                    {#if placeholderRow}
                        {@const Placeholder = placeholderRow}
                        <Placeholder height={rowHeight} index={vr.placeholderIndex} />
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
                {/if}
            </div>
        {/each}
    </div>

    <div
        class="text-center py-4"
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
    .virtual-list,
    .virtual-list * {
        overflow-anchor: none;
    }

    .virtual-space {
        position: relative;
        width: 100%;
    }

    .virtual-row {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        width: 100%;
    }

    .skeleton-row {
        border-radius: 12px;
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
