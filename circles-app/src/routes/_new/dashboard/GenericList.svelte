<script lang="ts">
    import {onMount, onDestroy, type SvelteComponent} from "svelte";
    import type {EventRow} from "@circles-sdk/data";
    import {getKeyFromItem} from "$lib/stores/query/circlesQueryStore";
    import type {Readable} from "svelte/store";

    export let store: Readable<{ data: EventRow[], next: () => Promise<boolean>, ended: boolean }>;
    export let row: typeof SvelteComponent;

    let observer: IntersectionObserver | null = null;
    let anchor: HTMLElement | undefined;

    onMount(async () => {
        if (!store) {
            throw new Error("Store is required");
        }
        await setupObserver();
    });

    const setupObserver = async () => {
        if (!anchor) return;

        if (observer) {
            observer.disconnect();
        }

        observer = new IntersectionObserver(async (entries) => {
            if ($store.ended || !entries[0].isIntersecting) {
                return;
            }

            await $store.next();

            if ($store.ended) {
                observer?.disconnect();
            }
        });

        const isInViewport = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        };

        // Repeatedly load data while the target is in the viewport and more data is available
        while (isInViewport(anchor) && !$store.ended) {
            await $store.next(); // Load the next page of transactions
        }

        if (!$store.ended) {
            observer.observe(anchor);
        }
    };

    onDestroy(() => {
        if (observer) {
            observer.disconnect();
        }
    });
</script>

<div class="overflow-x-auto">
    {#each ($store?.data ?? []) as tx (getKeyFromItem(tx))}
        <svelte:component this={row} item={tx}/>
    {/each}
    <div class="text-center py-4" bind:this={anchor}>
        {#if !$store?.ended}
            <span class="loading loading-spinner text-primary"></span>
            <span class="ml-2 text-gray-500">Loading more...</span>
        {:else}
            <span class="text-gray-500">End of list</span>
        {/if}
    </div>
</div>
