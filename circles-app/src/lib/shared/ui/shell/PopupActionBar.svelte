<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;padding-top:24px;">
  {@render children?.()}
</div>
