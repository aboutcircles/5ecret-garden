<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import IMask from 'imask';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
    import { roundToDecimals } from '$lib/utils/shared';
    import Avatar from './avatar/Avatar.svelte';
    import Tooltip from "$lib/components/Tooltip.svelte";

    interface Props {
        balanceRow: TokenBalanceRow;
        amount?: number;
        maxAmountCircles?: number;
    }

    let { balanceRow, amount = $bindable(0), maxAmountCircles = -1 }: Props = $props();

    let inputElement: HTMLInputElement | undefined = $state();
    let mask: IMask.InputMask<any> | null = null;

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

    function clampToMax(n: number): number {
        const cap = maxAmountCircles >= 0 ? maxAmountCircles : balanceRow.circles;
        return Math.max(0, Math.min(n, cap));
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
        const value = maxAmountCircles >= 0 ? roundToDecimals(maxAmountCircles) : roundToDecimals(balanceRow.circles);
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
        inputElement.addEventListener('blur', () => {
            const normalized = clampToMax(+amount || 0);
            amount = roundToDecimals(normalized);
            if (inputElement) {
                inputElement.value = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
        });
    });

    onDestroy(() => {
        mask?.destroy();
        mask = null;
    });
</script>

<!-- Mobile avatar above the input -->
<div class="flex md:hidden mt-4 md:mt-4">
    <Avatar
            address={balanceRow?.tokenOwner}
            clickable={false}
            view="horizontal"
            bottomInfo={tokenTypeToString(balanceRow?.tokenType)}
    />
</div>

<div
        class="w-full flex items-center justify-between border border-gray-400 rounded-lg font-bold px-4 mt-4"
>
    <div class="flex items-center">
        <input
                bind:this={inputElement}
                type="text"
                inputmode="decimal"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                placeholder="0.00"
                class="input input-lg p-0 text-3xl w-44 placeholder-gray-400 focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-none"
                style="caret-color: currentColor;"
        />
        <p class="text-3xl text-neutral-900 opacity-25">CRC</p>
    </div>
    <div class="hidden md:flex">
        <Avatar
                address={balanceRow?.tokenOwner}
                clickable={false}
                view="horizontal"
                bottomInfo={tokenTypeToString(balanceRow?.tokenType)}
        />
    </div>
</div>

<p class="font-medium text-sm mt-4">
    {maxAmountCircles >= 0
        ? roundToDecimals(maxAmountCircles)
        : '?'} <span class="text-gray-500">/ {roundToDecimals(balanceRow.circles)} CRC
        <Tooltip content="The max. amount depends on your trust network and blockchain limits. Try to chunk large transfers if you experience issues."/></span>
    <button class="btn btn-sm ml-4 font-normal" onclick={setMaxAmount}>
        Use Max
    </button>
</p>
