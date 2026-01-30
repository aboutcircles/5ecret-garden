<script lang="ts">
  import { page } from '$app/stores';
  import { sanitizeUrl } from '$lib/components/markdown/ast';

  let copyIcon = $state('/copy.svg');

  const rawTo = $derived($page.url.searchParams.get('to') ?? '');
  const destination = $derived(sanitizeUrl(rawTo));

  function copyDestination(): void {
    if (!destination) return;
    navigator.clipboard?.writeText(destination).catch(() => {});
    copyIcon = '/check.svg';
    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }
</script>

<div class="w-full flex justify-center px-4">
  <div class="w-full max-w-md mt-10 space-y-4">
    <h1 class="text-xl font-semibold">Leaving this app</h1>

    {#if destination}
      <div class="bg-base-100 border border-base-content/10 rounded-lg p-4 space-y-3">
        <div class="text-sm opacity-70">You are about to open this link in a new tab:</div>
        <div class="relative font-mono text-sm bg-base-200/50 border border-base-content/10 rounded-md p-3 pr-10">
          <div class="whitespace-nowrap overflow-x-auto">
            {destination}
          </div>

          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square absolute top-2 right-2"
            title="Copy address"
            aria-label="Copy address"
            onclick={copyDestination}
          >
            <img src={copyIcon} alt="" class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <a class="btn btn-primary" href={destination} target="_blank" rel="noopener noreferrer">Continue</a>
          <button type="button" class="btn btn-ghost" onclick={() => history.back()}>Back</button>
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        <div class="alert alert-error">
          Invalid or unsupported link.
        </div>
        <button type="button" class="btn btn-ghost" onclick={() => history.back()}>Back</button>
      </div>
    {/if}
  </div>
</div>
