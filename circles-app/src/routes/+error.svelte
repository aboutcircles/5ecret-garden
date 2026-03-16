<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="page page-pt page-stack page--md">
  <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
    <h1 class="text-6xl font-bold text-base-content/20 mb-4">{page.status}</h1>
    <p class="text-lg text-base-content/70 mb-6">
      {page.error?.message ?? 'Page not found'}
    </p>
    <div class="flex gap-3">
      <a href="/" class="btn btn-primary btn-sm">Go home</a>
      <button type="button" class="btn btn-ghost btn-sm" onclick={() => history.back()}>
        Go back
      </button>
    </div>
  </div>
</div>
