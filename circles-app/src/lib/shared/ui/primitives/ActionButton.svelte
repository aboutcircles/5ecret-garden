<script lang="ts" module>
    export type ActionButtonState =
        | 'Ready'
        | 'Working'
        | 'Error'
        | 'Retry'
        | 'Done'
        | 'Disabled';

    export interface ActionButtonTheme {
        ['Ready']: string;
        ['Working']: string;
        ['Error']: string;
        ['Retry']: string;
        ['Done']: string;
        ['Disabled']: string;
    }
</script>

<script lang="ts">
    import {RotateCcw, AlertTriangle, Check} from 'lucide';
    import Lucide from "$lib/shared/ui/icons/Lucide.svelte";
    import type { HTMLButtonAttributes } from 'svelte/elements';

    interface Props extends HTMLButtonAttributes {
        action: () => Promise<any>;
        title?: string;
        disabled?: boolean;
        theme?: ActionButtonTheme;
    }

    let {
        action,
        title = '',
        disabled = false,
        theme = {
            ['Ready']: 'btn-primary',
            ['Working']: 'btn-disabled',
            ['Error']: 'btn-warning',
            ['Retry']: 'btn-warning',
            ['Done']: 'btn-success',
            ['Disabled']: 'btn-disabled',
        },
        children,
        ...rest
    }: Props & { children?: any } = $props();
    const doneStateDuration: number = 2000;
    const errorTransitory: boolean = true;

    let buttonState: ActionButtonState = $state('Ready');
    let errorMessage: string = $state('');

    const executeAction = () => {
        if (disabled || buttonState === 'Done' || buttonState == 'Working') {
            return;
        }
        buttonState = 'Working';
        action()
            .then(() => {
                buttonState = 'Done';
                setTimeout(() => {
                    // Transition from Done to either Ready or Disabled
                    buttonState = disabled ? 'Disabled' : 'Ready';
                }, doneStateDuration);
            })
            .catch((err) => {
                errorMessage = err instanceof Error ? err.message : String(err);
                buttonState = errorTransitory ? 'Error' : 'Retry';
                if (errorTransitory) {
                    setTimeout(() => {
                        buttonState = 'Retry';
                    }, doneStateDuration); // Use the same duration for simplicity
                }
                console.error(err);
            });
    };

    $effect(() => {
        if (disabled && buttonState !== 'Done') {
            buttonState = 'Disabled';
        } else if (!disabled && buttonState === 'Disabled') {
            buttonState = 'Ready';
        }
    });
</script>

<button
        {...rest}
        onclick={executeAction}
        title={errorMessage ?? title}
        class="btn btn-sm inline-flex items-center gap-2 {theme[buttonState]}"
>
    {#if buttonState === 'Working'}
        <span class="loading loading-spinner loading-xs"></span>
    {:else if buttonState === 'Retry'}
        <Lucide icon={RotateCcw} size={16}/>
    {:else if buttonState === 'Error'}
        <Lucide icon={AlertTriangle} size={16} class="text-error"/>
    {:else if buttonState === 'Done'}
        <Lucide icon={Check} size={16} class="text-success"/>
    {/if}
    {@render children?.()}
</button>
