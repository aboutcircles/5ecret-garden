<script lang="ts">
  import SafeList from '$lib/pages/SafeList.svelte';
</script>

<div
  class="w-full flex flex-col items-center min-h-screen p-4 max-w-xl gap-y-4 mt-20"
>
  <div class="w-full">
    <a href="/connect-wallet">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <h2 class="font-bold text-[28px] md:text-[32px]">Select Circles Safe</h2>
  <p class="font-normal text-black/60 text-base">
    Please select the safe you want to use from the list below.
  </p>
  <SafeList />
</div>
