<script lang="ts">
  import type { Writable } from 'svelte/store';

  interface Props {
    text: string;
    filter: Writable<any | undefined>;
    value: any;
  }

  let { text, filter, value }: Props = $props();
</script>

<button
  class={`bg-base-200 border-none rounded-lg px-2 py-1 text-sm font-medium hover:text-base-content/70 hover:cursor-pointer ${
    $filter === value ? 'text-base-content' : 'text-base-content/40'
  }`}
  onclick={() => filter.set(value)}
>
  {text}
</button>
