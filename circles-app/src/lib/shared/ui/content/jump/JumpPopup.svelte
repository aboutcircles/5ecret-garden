<script lang="ts">
  import { popupControls } from '$lib/shared/state/popup';
  import { sanitizeUrl } from '$lib/shared/ui/content/markdown/ast';

  let copyIcon = $state('/copy.svg');

  interface Props {
    to?: string;
  }

  const { to = '' }: Props = $props();

  const destination = $derived(sanitizeUrl(to) ?? null);

  function copyDestination(): void {
    if (!destination) return;
    navigator.clipboard?.writeText(destination).catch(() => {});
    copyIcon = '/check.svg';
    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }

  function onBack() {
    popupControls.back();
  }

  function onContinue() {
    if (!destination) return;
    window.open(destination, '_blank', 'noopener,noreferrer');
    popupControls.back();
  }
</script>

<div class="w-full">
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
        <button type="button" class="btn btn-primary" onclick={onContinue}>Continue</button>
        <button type="button" class="btn btn-ghost" onclick={onBack}>Cancel</button>
      </div>
    </div>
  {:else}
    <div class="space-y-3">
      <div class="alert alert-error">
        Invalid or unsupported link.
      </div>
      <button type="button" class="btn btn-ghost" onclick={onBack}>Back</button>
    </div>
  {/if}
</div>
