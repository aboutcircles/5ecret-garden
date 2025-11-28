<script lang="ts">
    import { onDestroy, type Component } from 'svelte';
    import type { EventRow, TransactionHistoryRow } from '@circles-sdk/data';
    import { getKeyFromItem } from '$lib/stores/query/circlesQueryStore';
    import type { Readable } from 'svelte/store';

    interface Props<T extends Record<string, any> = any> {
        store: Readable<{ data: EventRow[] | TransactionHistoryRow[]; next: () => Promise<boolean>; ended: boolean; }>;
        row: Component<T>;
        // Approximate row height for placeholder sizing (px). Keep in sync with real row.
        rowHeight?: number;
        // Maximum number of eager placeholder pages to render ahead (1–2 recommended)
        maxPlaceholderPages?: number;
    }
    let { store, row, rowHeight = 64, maxPlaceholderPages = 0 }: Props = $props();

    let observer: IntersectionObserver | null = null;
    let anchor: HTMLElement | undefined = $state();
    let hasError = $state(false);
    let isLoadingNext = $state(false);
    // Number of placeholder rows currently mounted
    let placeholders = $state(0);
    // Track how many placeholder "pages" are currently staged
    let stagedPages = $state(0);

    function perPagePlaceholders(): number {
        const viewport = typeof window !== 'undefined' ? window.innerHeight : 700;
        return Math.min(30, Math.ceil(viewport / rowHeight) + 4);
    }

    function enqueuePlaceholderPage() {
        if (stagedPages >= (maxPlaceholderPages ?? 2)) return;
        const count = perPagePlaceholders();
        placeholders += count;
        stagedPages += 1;
    }

    function clearOnePlaceholderPage() {
        if (stagedPages <= 0) return;
        const count = perPagePlaceholders();
        placeholders = Math.max(0, placeholders - count);
        stagedPages = Math.max(0, stagedPages - 1);
    }

    const setupObserver = () => {
        if (observer) observer.disconnect();
        if (anchor && !$store?.ended && !hasError) {
            observer = new IntersectionObserver(async (entries) => {
                const hit = entries.some((e) => e.isIntersecting);
                if (hit && !$store.ended && !isLoadingNext) {
                    // Eagerly reserve space with placeholders before fetching
                    enqueuePlaceholderPage();
                    isLoadingNext = true;
                    try {
                        await $store.next();
                        hasError = false;
                    } catch {
                        // On error, remove all placeholders and show error state
                        placeholders = 0;
                        stagedPages = 0;
                        hasError = true;
                    } finally {
                        isLoadingNext = false;
                        // Remove one placeholder page now that data arrived (or failed)
                        clearOnePlaceholderPage();
                        // Re-arm the observer for subsequent pages
                        setupObserver();
                    }
                }
            }, { rootMargin: '400px 0px' });
            observer.observe(anchor);
        }
    };
    const handleRetry = async () => {
        try {
            enqueuePlaceholderPage();
            await $store.next();
            hasError = false;
        } catch {
            // keep error visible
        } finally {
            clearOnePlaceholderPage();
            setupObserver();
        }
    };
    $effect(() => { if (store && anchor) setupObserver(); });
    // Whenever the store data changes significantly (e.g., after a page append),
    // ensure no stale placeholders persist beyond what we staged.
    $effect(() => {
        // If list ended, clear placeholders immediately
        if ($store?.ended) { placeholders = 0; stagedPages = 0; }
    });
    onDestroy(() => { observer?.disconnect(); observer = null; });
</script>

<div class="w-full flex flex-col gap-y-1.5 py-2" role="list">
    {#each $store?.data ?? [] as item (getKeyFromItem(item))}
        {@const SvelteComponent_1 = row}
        <SvelteComponent_1 {item} />
    {/each}

    {#if placeholders > 0}
        {#each Array.from({ length: placeholders }) as _, i}
            <div class="skeleton-row" aria-hidden="true" style={`height: ${rowHeight}px`}>
                <div class="sk-row">
                    <div class="sk-avatar" />
                    <div class="sk-lines">
                        <div class="sk-line sk-line-1" />
                        <div class="sk-line sk-line-2" />
                    </div>
                    <div class="sk-amount" />
                </div>
            </div>
        {/each}
    {/if}

    <div
            class="text-center py-4"
            bind:this={anchor}
            aria-live="polite"
            aria-busy={$store && !$store?.ended && !hasError ? 'true' : 'false'}
    >
        {#if ($store?.data ?? []).length === 0 || $store?.ended}
            <span class="text-base-content/70">End of list</span>
        {:else if hasError}
            <span class="text-error">Error loading items</span>
            <button class="ml-2 link link-primary" onclick={handleRetry}>Retry</button>
        {:else}
            <span class="loading loading-spinner text-primary"></span>
            <span class="ml-2 text-base-content/70">Loading more...</span>
        {/if}
    </div>
</div>

<style>
    .skeleton-row {
        border-radius: 12px;
        /* Transparent background as requested (no grey panel background) */
        background: transparent;
        position: relative;
        overflow: hidden;
        padding: 8px 12px;
        display: block;
    }
    .sk-row { height: 100%; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; }
    .sk-avatar { width: 40px; height: 40px; border-radius: 9999px; background: color-mix(in oklab, currentColor 18%, transparent); }
    .sk-lines { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .sk-line { height: 10px; border-radius: 8px; background: color-mix(in oklab, currentColor 16%, transparent); }
    .sk-line-1 { width: 56%; }
    .sk-line-2 { width: 36%; }
    .sk-amount { width: 68px; height: 14px; border-radius: 8px; background: color-mix(in oklab, currentColor 22%, transparent); }
    @media (prefers-reduced-motion: no-preference) {
        .skeleton-row::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
            transform: translateX(-100%);
            animation: shimmer 1.1s infinite;
            pointer-events: none;
        }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
    }
</style>
