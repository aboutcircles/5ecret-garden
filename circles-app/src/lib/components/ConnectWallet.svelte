<script lang="ts">
  export let imgUrl: string;
  export let header: string;
  export let desc: string;
  export let route: string;

  export let recommended = false;
</script>

<!-- TODO: Use connect wallet and connect safe as a same component -->

<a
  href={route}
  class={`w-full border rounded-lg flex justify-between items-center p-4 shadow-sm hover:bg-black/5 ${recommended ? 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50' : ''}`}
>
  <div class="flex items-center gap-x-4">
    <img src={imgUrl} alt="Wallet Icon" class="w-12 h-12" />
    <div class="w-full flex flex-col">
      <div class="w-full flex items-center gap-x-2">
        <h2 class="font-bold md:text-lg">{header}</h2>
        {#if recommended}
        <span class="text-white badge badge-accent badge-sm text-sm leading-none text-yellow-400">★</span>
        {/if}
      </div>
      <p class="font-normal text-black/60 text-sm md:text-base">{desc}</p>
    </div>
  </div>
  <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
</a>
