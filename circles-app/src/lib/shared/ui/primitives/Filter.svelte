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
  class={`btn btn-xs rounded-lg border border-base-300 bg-base-200/70 px-2 py-1 text-sm font-medium hover:bg-base-200 hover:cursor-pointer ${
    $filter === value ? 'text-base-content' : 'text-base-content/60'
  }`}
  onclick={() => filter.set(value)}
>
  {text}
</button>
