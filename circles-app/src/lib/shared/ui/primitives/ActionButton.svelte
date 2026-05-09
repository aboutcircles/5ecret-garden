<script lang="ts" module>
    export type ActionButtonState =
        | 'Ready'
        | 'Working'
        | 'Error'
        | 'Retry'
        | 'Done'
        | 'Disabled';

    export type ActionButtonVariant = 'primary' | 'negative' | 'ghost';

    // Kept for backward compat — use `variant` prop instead
    export interface ActionButtonTheme {
        [key: string]: string;
    }
</script>

<script lang="ts">
    import { RotateCcw, AlertTriangle, Check } from 'lucide';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import type { HTMLButtonAttributes } from 'svelte/elements';
    import { T } from '$lib/design-system/tokens.js';

    interface Props extends HTMLButtonAttributes {
        action: () => Promise<any>;
        title?: string;
        disabled?: boolean;
        variant?: ActionButtonVariant;
        /** @deprecated pass `variant` instead */
        theme?: ActionButtonTheme;
    }

    let {
        action,
        title = '',
        disabled = false,
        variant = 'primary',
        theme,
        children,
        ...rest
    }: Props & { children?: any } = $props();

    const doneStateDuration = 2000;

    let buttonState: ActionButtonState = $state('Ready');
    let errorMessage: string = $state('');

    // Infer variant from legacy theme prop
    const effectiveVariant = $derived((): ActionButtonVariant => {
        if (theme?.Ready?.includes('error')) return 'negative';
        if (theme?.Ready?.includes('ghost')) return 'ghost';
        return variant;
    });

    const stateStyle = $derived((): string => {
        if (buttonState === 'Disabled')
            return `background:${T.pageDeep};color:${T.inkMuted};border:0;cursor:not-allowed;box-shadow:none;`;
        if (buttonState === 'Working')
            return `background:${T.pageDeep};color:${T.inkMuted};border:0;cursor:wait;box-shadow:none;`;
        if (buttonState === 'Done')
            return `background:${T.sageSoft};color:${T.positive};border:1px solid rgba(30,120,60,0.18);cursor:default;box-shadow:none;`;
        if (buttonState === 'Error' || buttonState === 'Retry')
            return `background:${T.warningSoft};color:${T.warning};border:1px solid rgba(176,112,20,0.2);cursor:pointer;box-shadow:none;`;
        // Ready state — based on variant
        if (effectiveVariant() === 'negative')
            return `background:${T.negativeSoft};color:${T.negative};border:1px solid rgba(196,68,48,0.2);cursor:pointer;box-shadow:none;`;
        if (effectiveVariant() === 'ghost')
            return `background:transparent;color:${T.inkMuted};border:0;cursor:pointer;box-shadow:none;`;
        return `background:${T.primary};color:#fff;border:0;cursor:pointer;box-shadow:0 4px 12px rgba(88,73,212,0.25);`;
    });

    function executeAction() {
        if (disabled || buttonState === 'Done' || buttonState === 'Working') return;
        buttonState = 'Working';
        action()
            .then(() => {
                buttonState = 'Done';
                setTimeout(() => {
                    buttonState = disabled ? 'Disabled' : 'Ready';
                }, doneStateDuration);
            })
            .catch((err) => {
                errorMessage = err instanceof Error ? err.message : String(err);
                buttonState = 'Retry';
                setTimeout(() => { buttonState = 'Retry'; }, doneStateDuration);
                console.error(err);
            });
    }

    $effect(() => {
        if (disabled && buttonState !== 'Done') buttonState = 'Disabled';
        else if (!disabled && buttonState === 'Disabled') buttonState = 'Ready';
    });
</script>

<button
    {...rest}
    onclick={executeAction}
    title={errorMessage || title}
    style="display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 18px;border-radius:9999px;font-family:{T.fontSans};font-size:13px;font-weight:580;transition:opacity 0.15s;{stateStyle()}"
>
    {#if buttonState === 'Working'}
        <svg class="ab-spin" style="width:14px;height:14px;flex-shrink:0;" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
        </svg>
    {:else if buttonState === 'Retry'}
        <Lucide icon={RotateCcw} size={14} />
    {:else if buttonState === 'Error'}
        <Lucide icon={AlertTriangle} size={14} />
    {:else if buttonState === 'Done'}
        <Lucide icon={Check} size={14} />
    {/if}
    {@render children?.()}
</button>

<style>
    @keyframes ab-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }
    .ab-spin { animation: ab-spin 0.9s linear infinite; }
</style>
