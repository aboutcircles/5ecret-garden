<script lang="ts">
  import { T } from '$lib/design-system/tokens';

  interface Props {
    content: string;
    children?: import('svelte').Snippet;
  }

  let { content, children }: Props = $props();

  let show = $state(false);
</script>

<span
  class="tooltip-host"
  onmouseenter={() => { show = true; }}
  onmouseleave={() => { show = false; }}
  onfocus={() => { show = true; }}
  onblur={() => { show = false; }}
  role="tooltip"
  tabindex="0"
  aria-label={content}
>
  {#if children}
    {@render children?.()}
  {:else}
    <img src="/question-mark.svg" alt="question mark icon" style="width:12px;height:12px;" />
  {/if}
  {#if show}
    <span
      class="tooltip-bubble"
      style="background:{T.inkBody};color:{T.surface};border-radius:6px;padding:4px 8px;font-size:11.5px;white-space:nowrap;max-width:240px;white-space:normal;"
      role="none"
    >{content}</span>
  {/if}
</span>

<style>
  .tooltip-host {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: default;
  }

  .tooltip-bubble {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
</style>
