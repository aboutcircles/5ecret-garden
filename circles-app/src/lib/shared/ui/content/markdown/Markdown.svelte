<script lang="ts">
  import { parseMarkdown } from '$lib/shared/ui/content/markdown/ast';
  import MarkdownBlock from '$lib/shared/ui/content/markdown/MarkdownBlock.svelte';

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
