<script lang="ts">

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

<!-- TODO: Use connect wallet and connect safe as a same component -->

<a
  href={route}
  class={`w-full border rounded-lg flex justify-between items-center p-4 shadow-sm hover:bg-base-200 ${recommended === 'Connect' ? 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50' : recommended === 'Register' ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-50' : ''}`}
>
  <div class="flex items-center gap-x-4">
    <img src={imgUrl} alt="Wallet Icon" class="w-12 h-12" />
    <div class="w-full flex flex-col">
      <div class="w-full flex items-center gap-x-2">
        <h2 class="font-bold md:text-lg">{header}</h2>
        {#if recommended}
          <span
            class={`text-white badge ${recommended === 'Connect' ? 'badge-accent' : 'badge-secondary'} badge-sm text-sm leading-none text-yellow-400`}
            >★</span
          >
        {/if}
      </div>
      <p class="font-normal text-black/60 text-sm md:text-base">{desc}</p>
    </div>
  </div>
  <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
</a>
