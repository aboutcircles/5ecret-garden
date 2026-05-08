<script lang="ts">
  import type { Writable } from 'svelte/store';
  import type { Snippet } from 'svelte';
  import { T } from '$lib/design-system/tokens.js';

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

<div class={className} style="margin-bottom:12px;display:flex;align-items:center;gap:8px;">
  <div style="
    flex:1;min-width:0;display:flex;align-items:center;gap:8px;
    background:{T.surface};border:1px solid {T.hairline};border-radius:9999px;
    padding:0 14px;height:38px;transition:border-color .15s,box-shadow .15s;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={T.inkMuted} stroke-width="1.8" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.1-4.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
    <input
      type="text"
      bind:this={inputEl}
      style="flex:1;min-width:0;background:transparent;border:0;padding:0;outline:none;font-family:{T.fontSans};font-size:13px;color:{T.ink};"
      {placeholder}
      bind:value={$query}
      onkeydown={handleInputKeydown}
      onfocus={onInputFocus}
    />
  </div>
  {@render actions?.()}
</div>
