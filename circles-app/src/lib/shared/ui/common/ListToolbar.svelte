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
    inputDataAttribute?: string;
    inputEl?: HTMLInputElement | null;
  }

  let {
    query,
    placeholder = 'Search…',
    class: className = '',
    actions,
    onInputKeydown,
    onInputFocus,
    inputDataAttribute,
    inputEl = $bindable(null)
  }: Props = $props();

  $effect(() => {
    if (!inputEl || !inputDataAttribute) return;
    inputEl.setAttribute(inputDataAttribute, 'true');
    return () => {
      inputEl?.removeAttribute(inputDataAttribute);
    };
  });
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
