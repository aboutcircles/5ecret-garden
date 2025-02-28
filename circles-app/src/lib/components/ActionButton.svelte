<script lang="ts" context="module">
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
  import { createEventDispatcher } from 'svelte';

  export let action: () => Promise<any>;
  export let title: string = '';
  export let doneStateDuration: number = 2000;
  export let errorTransitory: boolean = true;
  export let disabled: boolean = false;

  export let theme: ActionButtonTheme = {
    ['Ready']: 'bg-primary text-white',
    ['Working']: 'bg-gray-200 text-black',
    ['Error']: 'bg-yellow-500 text-white',
    ['Retry']: 'bg-yellow-500 text-white',
    ['Done']: 'bg-green-700 text-white',
    ['Disabled']: 'bg-gray-400 text-white',
  };

  const eventDispatcher = createEventDispatcher();

  let state: ActionButtonState = 'Ready';
  let errorMessage: string = '';

  const executeAction = () => {
    if (disabled || state === 'Done' || state == 'Working') {
      return;
    }
    state = 'Working';
    action()
      .then((result) => {
        result = result;
        state = 'Done';
        eventDispatcher('done', { result });
        setTimeout(() => {
          // Transition from Done to either Ready or Disabled
          state = disabled ? 'Disabled' : 'Ready';
        }, doneStateDuration);
      })
      .catch((err) => {
        errorMessage = err.message;
        state = errorTransitory ? 'Error' : 'Retry';
        eventDispatcher('error', { err });
        if (errorTransitory) {
          setTimeout(() => {
            state = 'Retry';
          }, doneStateDuration); // Use the same duration for simplicity
        }
        console.error(err);
      });
  };

  $: if (disabled && state !== 'Done') {
    state = 'Disabled';
  } else if (!disabled && state === 'Disabled') {
    state = 'Ready';
  }
</script>

<button
  on:click={executeAction}
  title={errorMessage ?? title}
  class="text-sm p-2 px-4 rounded-lg {theme[
    state
  ]} focus:outline-none transition"
>
  {#if state === 'Working'}
    <div
      class="loading-spinner inline-block border-t-2 border-b-2 border-gray-900 rounded-full w-4 h-4 animate-spin"
    ></div>
  {/if}
  {#if state === 'Retry'}
    <div class="inline-block">⟳</div>
  {:else if state === 'Error'}
    <div class="inline-block">⚠</div>
  {:else if state === 'Done'}
    <div class="inline-block">✓</div>
  {/if}
  <slot />
</button>
