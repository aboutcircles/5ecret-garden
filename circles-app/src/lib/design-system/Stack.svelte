<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    gap?: number;
    style?: string;
    children?: Snippet;
  }

  let { gap = 12, style = '', children }: Props = $props();
</script>

<div style="display:flex;flex-direction:column;gap:{gap}px;{style}">
  {@render children?.()}
</div>
