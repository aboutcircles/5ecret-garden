<script lang="ts">
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { ChevronRight } from 'lucide';

  interface Props {
    imgUrl: string;
    header: string;
    desc: string;
    route: string;
    recommended?: 'Connect' | 'Register' | undefined;
  }

  let {
    imgUrl,
    header,
    desc,
    route,
    recommended = undefined,
  }: Props = $props();
</script>

<!-- TODO: Use connect wallet and connect safe as a same component -->

<a
  href={route}
  class={`w-full border border-base-300 rounded-lg flex justify-between items-center p-4 shadow-sm hover:bg-base-200 ${recommended === 'Connect' ? 'bg-success/10 border-success/20 hover:bg-success/15' : recommended === 'Register' ? 'bg-info/10 border-info/20 hover:bg-info/15' : ''}`}
>
  <div class="flex items-center gap-x-4">
    <img src={imgUrl} alt="Wallet Icon" class="w-12 h-12" />
    <div class="w-full flex flex-col">
      <div class="w-full flex items-center gap-x-2">
        <h2 class="font-bold md:text-lg">{header}</h2>
        {#if recommended}
          <span
            class={`text-white badge ${recommended === 'Connect' ? 'badge-accent' : 'badge-secondary'} badge-sm text-sm leading-none`}
            >★</span
          >
        {/if}
      </div>
      <p class="font-normal text-black/60 text-sm md:text-base">{desc}</p>
    </div>
  </div>
  <Lucide icon={ChevronRight} size={16} />
</a>
