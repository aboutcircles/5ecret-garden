<script lang="ts">
  interface Props {
    content: string;
    children?: import('svelte').Snippet;
  }

  let { content, children }: Props = $props();
</script>

<div class="tooltip" data-tip={content}>
  {#if children}
    {@render children?.()}
  {:else}
    <img src="/question-mark.svg" alt="question mark icon" class="w-3 h-3" />
  {/if}
</div>
