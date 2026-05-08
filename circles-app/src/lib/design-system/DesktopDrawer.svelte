<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    width?: number;
    onClose?: () => void;
    children?: Snippet;
  }

  let { title = '', width = 480, onClose, children }: Props = $props();
</script>

<div style="
  margin-left:auto;height:100%;width:{width}px;
  background:{T.surface};
  box-shadow:-12px 0 40px rgba(15,10,30,0.18);
  display:flex;flex-direction:column;
">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid {T.hairlineSoft};">
    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.02em;">{title}</span>
    <button
      onclick={onClose}
      style="width:32px;height:32px;border-radius:9999px;background:{T.pageDeep};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
    >
      <Icon name="close" size={14} stroke={T.inkBody} />
    </button>
  </div>
  <div style="flex:1;overflow:auto;padding:24px;">
    {@render children?.()}
  </div>
</div>
