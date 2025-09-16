<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<article class="w-full max-w-2xl mx-auto flex flex-col gap-4">
  {@render children?.()}
</article>
