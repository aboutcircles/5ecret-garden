<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import IMask from 'imask';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import { TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import Tooltip from "$lib/shared/ui/primitives/Tooltip.svelte";
    import { T } from '$lib/design-system/tokens.js';

    interface Props {
        balanceRow: TokenBalanceRow;
        amount?: number;
        maxAmountCircles?: number;
        routeLoading?: boolean;
        onBackspaceAtEmpty?: () => void;
    }

    let {
        balanceRow,
        amount = $bindable(0),
        maxAmountCircles = -1,
        routeLoading = false,
        onBackspaceAtEmpty,
    }: Props = $props();

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

    function onAmountKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Backspace') return;
        if (!inputElement) return;

        const isEmpty = inputElement.value.trim().length === 0;
        const selectionStart = inputElement.selectionStart ?? 0;
        const selectionEnd = inputElement.selectionEnd ?? 0;
        const caretAtBeginning = selectionStart === 0 && selectionEnd === 0;

        if (!isEmpty || !caretAtBeginning) return;

        event.preventDefault();
        onBackspaceAtEmpty?.();
    }
</script>

<div style="
    background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:18px;
    padding:14px 16px;display:flex;flex-direction:column;gap:10px;
">
    <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Amount</div>

    <div style="display:flex;align-items:baseline;gap:8px;">
        <input
            bind:this={inputElement}
            data-send-amount-input
            data-send-step-initial-input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="0.00"
            style="
                flex:1;min-width:0;background:transparent;border:0;padding:0;outline:none;
                font-family:{T.fontDisplay};font-size:42px;letter-spacing:-0.02em;line-height:1;
                color:{T.ink};font-weight:400;
                caret-color:{T.primary};
            "
            onkeydown={onAmountKeydown}
        />
        <span style="font-family:{T.fontSans};font-size:18px;color:{T.inkMuted};font-weight:540;flex-shrink:0;">CRC</span>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div style="font-size:11.5px;color:{T.inkMuted};display:inline-flex;align-items:center;gap:4px;">
            {#if isAutoRoute}
                Route cap
                {#if routeLoading}
                    <span class="loading loading-spinner loading-xs" style="color:{T.primary};" aria-label="Loading route cap"></span>
                {/if}
                <span style="color:{T.ink};font-weight:540;font-variant-numeric:tabular-nums;">{routeCapDisplay}</span>
                <Tooltip content="Availability depends on your trust network and routing limits." />
            {:else}
                Available <span style="color:{T.ink};font-weight:540;font-variant-numeric:tabular-nums;">{roundToDecimals(balanceRow.circles)}</span>
            {/if}
        </div>
        <button
            type="button"
            style="height:26px;padding:0 12px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:11.5px;font-weight:540;cursor:pointer;"
            onclick={setMaxAmount}
        >Use max</button>
    </div>
</div>
