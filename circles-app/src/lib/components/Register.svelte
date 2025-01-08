<script lang="ts">
  export let imgUrl: string;
  export let header: string;
  export let desc: string;
  export let route: string;
</script>

<div
  class="w-72 border rounded-lg flex flex-col gap-y-4 justify-between items-center p-4 shadow-sm"
>
  <img src={imgUrl} alt="Wallet Icon" class="w-12 h-12" />
  <div class="flex flex-col">
    <h2 class="font-bold md:text-lg">{header}</h2>
    <p class="font-normal text-black/60 text-sm md:text-base">{desc}</p>
  </div>
  <a href={route} class="btn btn-primary btn-sm">Register</a>
</div>
