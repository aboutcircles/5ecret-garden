<script lang="ts">
  import { T } from '$lib/design-system/tokens';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let { title, description = '', actions, children }: Props = $props();
</script>

<section style="background:{T.pageDeep};border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px;">
  <header style="display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
    <div>
      <h2 style="font-weight:700;margin:0;color:{T.ink};">{title}</h2>
      {#if description}
        <p style="font-size:13px;color:{T.inkMuted};margin:4px 0 0;">{description}</p>
      {/if}
    </div>
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:flex-end;">
      {@render actions?.()}
    </div>
  </header>
  <div style="display:flex;flex-direction:column;gap:12px;">
    {@render children?.()}
  </div>
</section>