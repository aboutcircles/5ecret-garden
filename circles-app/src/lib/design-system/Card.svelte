<script lang="ts">
  import { T } from './tokens.js';
  import type { Snippet } from 'svelte';

  interface Props {
    padding?: number | string;
    interactive?: boolean;
    style?: string;
    children?: Snippet;
    onclick?: () => void;
  }

  let { padding = 24, interactive, style = '', onclick, children }: Props = $props();
  const pad = typeof padding === 'number' ? `${padding}px` : padding;
</script>

<div
  onclick={onclick}
  style="
    background: {T.surface}; border-radius: {T.radius.lg}px;
    padding: {pad}; box-shadow: {T.shadow.sm};
    border: 1px solid {T.hairlineSoft};
    {interactive ? 'cursor: pointer; transition: box-shadow .18s, transform .18s;' : ''}
    {style}
  "
>{@render children?.()}</div>
