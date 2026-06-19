<script lang="ts">
  interface Props {
    content: string;
    /** Extra classes for the tooltip wrapper, e.g. "block w-full" to span its container. */
    class?: string;
    children?: import('svelte').Snippet;
  }

  let { content, class: klass = '', children }: Props = $props();
</script>

<div class="tooltip {klass}" data-tip={content}>
  {#if children}
    {@render children?.()}
  {:else}
    <img src="/question-mark.svg" alt="question mark icon" class="w-3 h-3" />
  {/if}
</div>
