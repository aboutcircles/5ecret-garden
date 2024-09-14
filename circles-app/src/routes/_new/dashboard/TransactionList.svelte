<script lang="ts">
    import {onMount, onDestroy} from "svelte";
    import {createTransactionHistory} from "$lib/stores/transactionHistory";
    import TransactionRow from "./TransactionRow.svelte";
    import type {TokenType, TransactionHistoryRow} from "@circles-sdk/data";
    import {getKeyFromItem} from "$lib/stores/query/circlesQueryStore";
    import type {Readable} from "svelte/store";

    export let demurragedType: Set<TokenType>;
    export let staticTypes: Set<TokenType>;
    export let crcTypes: Set<TokenType>;

    let observer: IntersectionObserver | null = null;

    let ended: boolean = false;
    let anchor: HTMLElement | undefined;

    let transactionHistory: Readable<{
        data: TransactionHistoryRow[],
        next: () => Promise<boolean>,
        ended: boolean
    }>;

    onMount(async () => {
        transactionHistory = await createTransactionHistory();
        await setupObserver();
    });

    const setupObserver = async () => {
        if (!anchor) return;

        if (observer) {
            observer.disconnect();
        }

        observer = new IntersectionObserver(async (entries) => {
            if (ended || !entries[0].isIntersecting) {
                return;
            }

            await $transactionHistory.next();

            if (ended) {
                observer?.disconnect();
            }
        });

        // Helper function to check if the element is in the viewport
        const isInViewport = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        };

        // Delay function for creating a short wait before the next action
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Repeatedly load data while the target is in the viewport and more data is available
        while (isInViewport(anchor) && !ended) {
            ended = await $transactionHistory.next(); // Load the next page of transactions
        }

        if (!ended) {
            observer.observe(anchor);
        }
    };

    onDestroy(() => {
        if (observer) observer.disconnect();
    });
</script>

<div class="overflow-x-auto">
    <table class="table w-full">
        <thead>
        <tr>
            <th>Date</th>
            <th>From/to</th>
            <th>Circles</th>
            <th>Static Circles</th>
            <th>CRC</th>
            <th>Type</th>
        </tr>
        </thead>
        <tbody>
        {#each ($transactionHistory?.data ?? []) as tx (getKeyFromItem(tx))}
            <TransactionRow
                    tx={tx}
                    demurragedType={demurragedType}
                    staticTypes={staticTypes}
                    crcTypes={crcTypes}
            />
        {/each}
        <tr bind:this={anchor}>
            {#if !$transactionHistory?.ended}
                <td colspan="6" class="text-center">Loading more ..</td>
            {:else}
                <td colspan="6" class="text-center">End</td>
            {/if}
        </tr>
        </tbody>
    </table>
</div>
