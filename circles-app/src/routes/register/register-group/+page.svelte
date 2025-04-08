<script lang="ts">
  import RegisterGroup from '$lib/pages/RegisterGroup.svelte';
</script>

<div
  class="w-full flex flex-col min-h-screen max-w-4xl gap-y-4 justify-center"
>
  <div class="w-full">
    <a href="/register">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <RegisterGroup />
</div>
