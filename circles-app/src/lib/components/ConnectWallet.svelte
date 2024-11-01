<script lang="ts">
  export let imgUrl: string;
  export let header: string;
  export let desc: string;
  export let route: string;
</script>

<!-- TODO: Use connect wallet and connect safe as a same component -->

<a
  href={route}
  class="w-full border rounded-lg flex justify-between items-center p-4 shadow-sm hover:bg-black/5"
>
  <div class="flex items-center gap-x-4">
    <img src={imgUrl} alt="Wallet Icon" class="w-12 h-12" />
    <div class="flex flex-col">
      <h2 class="font-bold md:text-lg">{header}</h2>
      <p class="font-normal text-black/60 text-sm md:text-base">{desc}</p>
    </div>
  </div>
  <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
</a>
