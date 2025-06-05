<script lang="ts">
  import Disclaimer from '$lib/components/Disclaimer.svelte';
  import RegisterGroup from '$lib/pages/RegisterGroup.svelte';
</script>

<div
  class="w-full flex flex-col min-h-screen max-w-4xl gap-y-4 justify-center"
>
  <div class="w-full">
    <button onclick={() => history.back()}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <Disclaimer />
  <RegisterGroup />
</div>
