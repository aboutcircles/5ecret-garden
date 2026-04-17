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

  function handleInputKeydown(event: KeyboardEvent): void {
    onInputKeydown?.(event);
  }

  $effect(() => {
    if (!inputEl || !inputDataAttribute) return;
    const attrs = inputDataAttribute
      .split(/\s+/)
      .map((it) => it.trim())
      .filter(Boolean);
    for (const attr of attrs) {
      inputEl.setAttribute(attr, 'true');
    }
    return () => {
      if (!inputEl) return;
      for (const attr of attrs) {
        inputEl.removeAttribute(attr);
      }
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
    onkeydown={handleInputKeydown}
    onfocus={onInputFocus}
  />
  {@render actions?.()}
</div>
