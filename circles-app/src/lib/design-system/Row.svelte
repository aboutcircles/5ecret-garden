<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    gap?: number;
    align?: string;
    justify?: string;
    wrap?: boolean;
    style?: string;
    children?: Snippet;
  }

  let { gap = 12, align = 'center', justify = 'flex-start', wrap = false, style = '', children }: Props = $props();
</script>

<div style="display:flex;align-items:{align};justify-content:{justify};gap:{gap}px;flex-wrap:{wrap ? 'wrap' : 'nowrap'};{style}">
  {@render children?.()}
</div>
