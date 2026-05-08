<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';
  import CirclesLogo from './CirclesLogo.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    large?: boolean;
    transparent?: boolean;
    leading?: Snippet;
    trailing?: Snippet;
  }

  let { title, large, transparent, leading, trailing }: Props = $props();

  function mobileIconBtnStyle() {
    return `width: 36px; height: 36px; border-radius: 9999px; background: ${T.surface}; border: 1px solid ${T.hairline}; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: ${T.shadow.xs};`;
  }
</script>

<div style="
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 18px 6px;
  background: {transparent ? 'transparent' : T.page};
">
  <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
    {#if leading}
      {@render leading()}
    {:else}
      <CirclesLogo size={22} />
      <span style="
        font-size: 10px; font-weight: 580; color: {T.inkSubtle};
        padding: 2px 6px; border-radius: 9999px; background: {T.pageDeep};
        letter-spacing: 0.04em; text-transform: lowercase;
      ">beta</span>
    {/if}
    {#if title}
      <span style="font-family: {T.fontDisplay}; font-size: {large ? 22 : 16}px; color: {T.ink}; letter-spacing: -0.01em; margin-left: 4px;">{title}</span>
    {/if}
  </div>
  <div style="display: flex; gap: 6px;">
    {#if trailing}
      {@render trailing()}
    {:else}
      <button style={mobileIconBtnStyle()}><Icon name="bell" size={16} stroke={T.inkBody} /></button>
      <button style={mobileIconBtnStyle()}><Icon name="qr" size={16} stroke={T.inkBody} /></button>
    {/if}
  </div>
</div>
