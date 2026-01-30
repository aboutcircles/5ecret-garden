<script lang="ts">
  import { page } from '$app/stores';
  import { sanitizeUrl } from '$lib/components/markdown/ast';

  const rawTo = $derived($page.url.searchParams.get('to') ?? '');
  const destination = $derived(sanitizeUrl(rawTo));
</script>

<div class="max-w-2xl mx-auto p-4 space-y-4">
  <h1 class="text-xl font-semibold">Leaving this app</h1>

  {#if destination}
    <div class="bg-base-100 border rounded-lg p-4 space-y-3">
      <div class="text-sm opacity-70">Destination</div>
      <div class="font-mono break-all">{destination}</div>

      <div class="flex flex-wrap gap-2">
        <a class="btn btn-primary" href={destination} target="_blank" rel="noopener noreferrer">Continue</a>
        <button type="button" class="btn btn-ghost" onclick={() => history.back()}>Back</button>
      </div>
    </div>
  {:else}
    <div class="alert alert-error">
      Invalid or unsupported link.
    </div>
    <button type="button" class="btn btn-ghost" onclick={() => history.back()}>Back</button>
  {/if}
</div>
