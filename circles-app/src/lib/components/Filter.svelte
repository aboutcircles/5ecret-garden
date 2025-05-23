<script lang="ts">
  interface Props {
    text: string;
    filter: any;
    value: any;
    set: (val: any) => void;
  }

  let { text, filter, value, set }: Props = $props();
</script>

<button
  class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm font-medium hover:text-black/70 hover:cursor-pointer ${
    filter === value ? 'text-black' : 'text-gray-400'
  }`}
  onclick={() => set(value)}
>
  {text}
</button>