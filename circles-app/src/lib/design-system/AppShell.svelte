<script lang="ts">
  import { T } from './tokens.js';
  import Sidebar from './Sidebar.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    active?: string;
    onNavigate?: (id: string) => void;
    top?: Snippet;
    hideMint?: boolean;
    contentStyle?: string;
    children?: Snippet;
  }

  let { active = 'wallet', onNavigate, top, hideMint, contentStyle = '', children }: Props = $props();
</script>

<div style="
  width: 1440px; height: 900px; background: {T.page};
  display: flex; font-family: {T.fontSans}; color: {T.inkBody};
  overflow: hidden; position: relative;
">
  <Sidebar {active} {onNavigate} {hideMint} />
  <main style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
    {#if top}{@render top()}{/if}
    <div style="flex: 1; overflow: auto; padding: 28px 36px 40px; {contentStyle}">
      {@render children?.()}
    </div>
  </main>
</div>
