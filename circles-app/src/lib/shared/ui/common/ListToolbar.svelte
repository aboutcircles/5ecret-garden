<script lang="ts">
  import type { Writable } from 'svelte/store';
  import type { Snippet } from 'svelte';

  interface Props {
    query: Writable<string>;
    placeholder?: string;
    class?: string;
    actions?: Snippet;
  }

  let {
    query,
    placeholder = 'Search…',
    class: className = '',
    actions
  }: Props = $props();
</script>

<div class={`mb-3 flex items-center gap-2 ${className}`.trim()}>
  <input
    type="text"
    class="input input-bordered w-full"
    {placeholder}
    bind:value={$query}
  />
  {@render actions?.()}
</div>
