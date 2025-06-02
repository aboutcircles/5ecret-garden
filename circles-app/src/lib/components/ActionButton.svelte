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
      ['Ready']: 'bg-primary text-white',
      ['Working']: 'bg-gray-200 text-black',
      ['Error']: 'bg-yellow-500 text-white',
      ['Retry']: 'bg-yellow-500 text-white',
      ['Done']: 'bg-green-700 text-white',
      ['Disabled']: 'bg-gray-400 text-white',
    },
  }: Props = $props();
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
      .then((result) => {
        result = result;
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
  class="text-sm p-2 px-4 rounded-lg {theme[
    buttonState
  ]} focus:outline-hidden transition"
>
  {#if buttonState === 'Working'}
    <div
      class="loading-spinner inline-block border-t-2 border-b-2 border-gray-900 rounded-full w-4 h-4 animate-spin"
    ></div>
  {/if}
  {#if buttonState === 'Retry'}
    <div class="inline-block">⟳</div>
  {:else if buttonState === 'Error'}
    <div class="inline-block">⚠</div>
  {:else if buttonState === 'Done'}
    <div class="inline-block">✓</div>
  {/if}
  <slot />
</button>
