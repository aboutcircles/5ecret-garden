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
    <img src="/question-mark.svg" alt="question mark icon" class="w-4 h-4" />
  {/if}
</div>
