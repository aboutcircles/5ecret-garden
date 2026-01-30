<script lang="ts">
  import { parseMarkdown } from '$lib/components/markdown/ast';
  import MarkdownBlock from '$lib/components/markdown/MarkdownBlock.svelte';

  interface Props {
    content: string | null | undefined;
    class?: string;
  }

  let { content, class: className }: Props = $props();
  const root = $derived(parseMarkdown(String(content ?? '')));
</script>

<div class={className}>
  {#each root.children as block (block)}
    <MarkdownBlock node={block} />
  {/each}
</div>
