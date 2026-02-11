<script lang="ts">
  import type { Writable } from 'svelte/store';
  import type { Snippet } from 'svelte';

  interface Props {
    query: Writable<string>;
    placeholder?: string;
    class?: string;
    actions?: Snippet;
    onInputKeydown?: (event: KeyboardEvent) => void;
    onInputFocus?: (event: FocusEvent) => void;
    inputEl?: HTMLInputElement | null;
  }

  let {
    query,
    placeholder = 'Search…',
    class: className = '',
    actions,
    onInputKeydown,
    onInputFocus,
    inputEl = $bindable(null)
  }: Props = $props();
</script>

<div class={`mb-3 flex items-center gap-2 ${className}`.trim()}>
  <input
    type="text"
    bind:this={inputEl}
    class="input input-bordered w-full"
    {placeholder}
    bind:value={$query}
    onkeydown={onInputKeydown}
    onfocus={onInputFocus}
  />
  {@render actions?.()}
</div>
