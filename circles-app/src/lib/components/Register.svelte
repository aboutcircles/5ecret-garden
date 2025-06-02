<script lang="ts">
  interface Props {
    imgUrl: string;
    header: string;
    desc: string;
    route: string;
  }

  let {
    imgUrl,
    header,
    desc,
    route
  }: Props = $props();
</script>

<div
  class="w-72 border border-base-300 rounded-lg flex flex-col gap-y-4 justify-between items-center p-4 shadow-xs"
>
  <img src={imgUrl} alt="Wallet Icon" class="w-12 h-12" />
  <div class="flex flex-col">
    <h2 class="font-bold md:text-lg">{header}</h2>
    <p class="font-normal text-black/60 text-sm md:text-base">{desc}</p>
  </div>
  <a href={route} class="btn btn-primary btn-sm">Register</a>
</div>
