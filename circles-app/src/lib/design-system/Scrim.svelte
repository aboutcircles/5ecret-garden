<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    dark?: number;
    blur?: number;
    style?: string;
    children?: Snippet;
  }

  let { dark = 0.45, blur = 12, style = '', children }: Props = $props();
</script>

<div style="
  position:absolute;inset:0;z-index:100;
  background:rgba(15,10,30,{dark});
  backdrop-filter:blur({blur}px);
  -webkit-backdrop-filter:blur({blur}px);
  display:flex;
  {style}
">
  {@render children?.()}
</div>
