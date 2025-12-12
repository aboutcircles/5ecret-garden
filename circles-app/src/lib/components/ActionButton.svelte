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
    import Lucide from "$lib/icons/Lucide.svelte";

    interface Props {
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
                errorMessage = err.message;
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
