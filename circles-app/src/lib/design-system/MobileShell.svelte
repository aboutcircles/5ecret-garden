<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';
  import CirclesLogo from './CirclesLogo.svelte';
  import MobileTabBar from './MobileTabBar.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    active?: string;
    onNav?: (id: string) => void;
    header?: Snippet;
    hideTabs?: boolean;
    scroll?: boolean;
    bg?: string;
    children?: Snippet;
  }

  let { active, onNav, header, hideTabs, scroll = true, bg, children }: Props = $props();
</script>

<div style="
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  background: {bg || T.page};
  position: relative;
  overflow: hidden;
  padding-top: 47px;
">
  {#if header}{@render header()}{/if}
  <div style="flex: 1; overflow: {scroll ? 'auto' : 'hidden'}; padding-bottom: {hideTabs ? 0 : 110}px;">
    {@render children?.()}
  </div>
  {#if !hideTabs}
    <MobileTabBar {active} {onNav} />
  {/if}
</div>
