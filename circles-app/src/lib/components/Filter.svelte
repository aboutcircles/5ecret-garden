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
  class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm font-medium hover:text-black/70 hover:cursor-pointer ${
    $filter === value ? 'text-black' : 'text-gray-400'
  }`}
  onclick={() => filter.set(value)}
>
  {text}
</button>
