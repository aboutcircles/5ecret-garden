<script lang="ts">
  import type { Block } from '$lib/shared/ui/content/markdown/ast';
  import MarkdownInline from '$lib/shared/ui/content/markdown/MarkdownInline.svelte';

  interface Props {
    node: Block;
  }

  let { node }: Props = $props();
</script>

{#snippet renderBlock(n: Block)}
  {#if n.type === 'paragraph'}
    <p>
      {#each n.children as child}
        <MarkdownInline node={child} />
      {/each}
    </p>
  {:else if n.type === 'blankLine'}
    <br />
  {:else if n.type === 'blockquote'}
    <blockquote>
      {#each n.children as child}
        {@render renderBlock(child)}
      {/each}
    </blockquote>
  {:else if n.type === 'list'}
    {#if n.ordered}
      <ol>
        {#each n.items as item}
          <li>
            {#each item as child}
              <MarkdownInline node={child} />
            {/each}
          </li>
        {/each}
      </ol>
    {:else}
      <ul>
        {#each n.items as item}
          <li>
            {#each item as child}
              <MarkdownInline node={child} />
            {/each}
          </li>
        {/each}
      </ul>
    {/if}
  {:else if n.type === 'code'}
    <pre><code class={n.lang ? `language-${n.lang}` : undefined}>{n.value}</code></pre>
  {/if}
{/snippet}

{@render renderBlock(node)}
