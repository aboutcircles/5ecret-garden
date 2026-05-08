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
    recommended = undefined
  }: Props = $props();
</script>

<a
  href={route}
  class={[
    'w-full border rounded-[14px] flex justify-between items-center p-4 shadow-sm transition-colors',
    recommended === 'Connect'
      ? 'bg-success/10 border-success/30 hover:bg-success/15'
      : recommended === 'Register'
        ? 'bg-primary/8 border-primary/20 hover:bg-primary/12'
        : 'bg-base-100 border-base-300 hover:bg-base-200',
  ].join(' ')}
>
  <div class="flex items-center gap-x-4">
    <img src={imgUrl} alt="" class="w-12 h-12" aria-hidden="true" />
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center gap-x-2">
        <h2 class="font-semibold text-base-content md:text-lg">{header}</h2>
        {#if recommended}
          <span class={`badge badge-sm ${recommended === 'Connect' ? 'badge-accent' : 'badge-primary'}`}>
            {recommended}
          </span>
        {/if}
      </div>
      <p class="text-base-content/60 text-sm">{desc}</p>
    </div>
  </div>
  <Lucide icon={ChevronRight} size={16} class="shrink-0 text-base-content/40 ml-2" />
</a>
