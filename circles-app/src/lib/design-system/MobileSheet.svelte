<script lang="ts">
  import { T } from './tokens.js';
  import type { Snippet } from 'svelte';

  interface Props {
    height?: number;
    padding?: number;
    children?: Snippet;
  }

  let { height = 540, padding = 22, children }: Props = $props();
</script>

<div style="
  position:absolute;left:0;right:0;bottom:0;z-index:110;
  background:{T.surface};
  border-radius:28px 28px 0 0;
  height:{height}px;max-height:{height}px;
  box-shadow:0 -8px 40px rgba(15,10,30,0.18);
  display:flex;flex-direction:column;
  overflow:hidden;
">
  <!-- Drag handle -->
  <div style="display:flex;justify-content:center;padding:10px 0 4px;">
    <span style="width:36px;height:4px;border-radius:2px;background:rgba(15,10,30,0.18);display:block;"></span>
  </div>
  <div style="padding:0 {padding}px {padding}px;overflow:auto;flex:1;">
    {@render children?.()}
  </div>
</div>
