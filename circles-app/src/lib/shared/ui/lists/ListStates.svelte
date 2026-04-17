<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    loading?: boolean;
    error?: string | null;
    isEmpty?: boolean;
    isNoMatches?: boolean;

    loadingLabel?: string;
    emptyLabel?: string;
    noMatchesLabel?: string;

    children?: Snippet;
  }

  let {
    loading = false,
    error = null,
    isEmpty = false,
    isNoMatches = false,
    loadingLabel = 'Loading…',
    emptyLabel = 'No entries',
    noMatchesLabel = 'No matches',
    children
  }: Props = $props();
</script>

{#if loading}
  <div class="w-full py-6 text-center text-base-content/60">{loadingLabel}</div>
{:else if error}
  <div class="w-full py-6 text-center text-error">{error}</div>
{:else if isEmpty}
  <div class="w-full py-6 text-center text-base-content/60">{emptyLabel}</div>
{:else if isNoMatches}
  <div class="w-full py-6 text-center text-base-content/60">{noMatchesLabel}</div>
{:else}
  {@render children?.()}
{/if}
