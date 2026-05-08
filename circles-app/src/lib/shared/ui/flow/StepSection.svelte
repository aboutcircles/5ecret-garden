<script lang="ts">
  import type { Snippet } from 'svelte';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    title?: string;
    subtitle?: string;
    className?: string;
    titleClassName?: string;
    children?: Snippet;
  }

  let {
    title,
    subtitle,
    className = '',
    titleClassName = '',
    children,
  }: Props = $props();
</script>

<section
  class={className}
  style="
    background:{T.surface};
    border:1px solid {T.hairlineSoft};
    border-radius:16px;
    padding:16px 18px;
    box-shadow:{T.shadow.xs};
    display:flex;flex-direction:column;gap:12px;
  "
>
  {#if title || subtitle}
    <header class={titleClassName}>
      {#if title}
        <h3 style="font-family:{T.fontSans};font-size:13.5px;font-weight:580;color:{T.ink};margin:0;letter-spacing:-0.005em;">{title}</h3>
      {/if}
      {#if subtitle}
        <p style="font-size:12px;color:{T.inkMuted};margin:3px 0 0;line-height:1.45;">{subtitle}</p>
      {/if}
    </header>
  {/if}

  {@render children?.()}
</section>
