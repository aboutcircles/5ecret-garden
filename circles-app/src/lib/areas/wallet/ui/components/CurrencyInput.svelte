<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import IMask from 'imask';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import { TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import Tooltip from "$lib/shared/ui/primitives/Tooltip.svelte";

    interface Props {
        balanceRow: TokenBalanceRow;
        amount?: number;
        maxAmountCircles?: number;
        routeLoading?: boolean;
    }

    let { balanceRow, amount = $bindable(0), maxAmountCircles = -1, routeLoading = false }: Props = $props();

    let inputElement: HTMLInputElement | undefined = $state();
    let mask: IMask.InputMask<any> | null = null;
    let blurListener: (() => void) | null = null;

    // Single IMask config (2 decimals, no negatives)
    const maskOptions: IMask.AnyMaskedOptions = {
        mask: Number,
        scale: 2,
        signed: false,
        thousandsSeparator: ',',
        padFractionalZeros: false,
        normalizeZeros: true,
        radix: '.',
        mapToRadix: ['.'],
        // Do not show underscores — they can make the caret look “gone”
        // placeholderChar: '_',  // <-- removed on purpose
    };

    let maxDisplayAmount = $derived(maxAmountCircles >= 0 ? maxAmountCircles : balanceRow.circles);
    let isAutoRoute = $derived(balanceRow?.tokenAddress === TransitiveTransferTokenAddress);
    let routeCapDisplay = $derived(
        routeLoading
            ? '- / -'
            : `${roundToDecimals(maxDisplayAmount)} / ${roundToDecimals(balanceRow.circles)}`
    );

    function clampToMax(n: number): number {
        return Math.max(0, Math.min(n, maxDisplayAmount));
    }

    function setFromText(text: string) {
        // Parse the masked text into a float
        const numeric = parseFloat(text.replace(/,/g, ''));
        if (!isFinite(numeric)) return;
        amount = clampToMax(numeric);
        // Keep mask’s visible text in sync if we clamped
        if (mask && mask.unmaskedValue !== numeric.toString()) {
            // Re-render the visual if clamped
            const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            mask.updateValue(); // ensure internal state sync
            inputElement!.value = formatted;
        }
    }

    function setMaxAmount() {
        const value = roundToDecimals(maxDisplayAmount);
        amount = value;
        if (inputElement) {
            inputElement.value = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            // put caret at end
            const len = inputElement.value.length;
            inputElement.setSelectionRange?.(len, len);
        }
    }

    onMount(() => {
        if (!inputElement) return;

        // Init once
        mask = IMask(inputElement, maskOptions);

        // Prime the UI with existing amount
        if (amount > 0) {
            inputElement.value = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }

        // Use IMask’s event instead of raw oninput/onblur
        mask.on('accept', () => {
            // NOTE: IMask provides both value and unmaskedValue; for decimals we parse the visible text
            setFromText(inputElement!.value);
        });

        // On blur, normalize to our clamped/rounded form
        const handleBlur = () => {
            const normalized = clampToMax(+amount || 0);
            amount = roundToDecimals(normalized);
            if (inputElement) {
                inputElement.value = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
        };

        inputElement.addEventListener('blur', handleBlur);
        blurListener = () => inputElement?.removeEventListener('blur', handleBlur);
    });

    onDestroy(() => {
        blurListener?.();
        blurListener = null;
        mask?.destroy();
        mask = null;
    });
</script>

<div class="mt-3 rounded-2xl bg-base-200/60 p-4 space-y-3">
    <div class="text-xs font-semibold uppercase tracking-wide text-base-content/70">Amount</div>

    <div class="flex items-baseline gap-2">
        <input
                bind:this={inputElement}
                data-send-amount-input
                type="text"
                inputmode="decimal"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                placeholder="0.00"
                class="w-full bg-transparent border-0 p-0 text-4xl font-semibold placeholder-base-content/30 focus:outline-none focus-visible:outline-none focus:ring-0"
                style="caret-color: currentColor;"
        />
        <span class="text-xl md:text-2xl text-base-content/45 font-medium">Circles</span>
    </div>

    <div class="flex items-center justify-between gap-3 text-sm">
        <div class="text-base-content/70">
            {#if isAutoRoute}
                <span class="inline-flex items-center gap-1">
                    Route cap
                    {#if routeLoading}
                        <span class="loading loading-spinner loading-xs" aria-label="Loading route cap"></span>
                    {/if}
                </span>
                : {routeCapDisplay}
                <span class="text-base-content/55 ml-1">
                    <Tooltip content="Availability depends on your trust network and routing limits."/>
                </span>
            {:else}
                Available: {roundToDecimals(balanceRow.circles)}
            {/if}
        </div>
        <button class="btn btn-xs btn-ghost" onclick={setMaxAmount}>
            Use max
        </button>
    </div>
</div>
