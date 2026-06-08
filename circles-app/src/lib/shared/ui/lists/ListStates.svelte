<script lang="ts">
  import type { Snippet } from 'svelte';
  import { T } from '$lib/design-system/tokens.js';

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
  <div style="width:100%;padding:24px 0;text-align:center;color:{T.inkMuted};">{loadingLabel}</div>
{:else if error}
  <div style="width:100%;padding:24px 0;text-align:center;color:{T.negative};">{error}</div>
{:else if isEmpty}
  <div style="width:100%;padding:24px 0;text-align:center;color:{T.inkMuted};">{emptyLabel}</div>
{:else if isNoMatches}
  <div style="width:100%;padding:24px 0;text-align:center;color:{T.inkMuted};">{noMatchesLabel}</div>
{:else}
  {@render children?.()}
{/if}
