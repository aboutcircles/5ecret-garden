<script lang="ts">
  import type { Inline } from '$lib/shared/ui/content/markdown/ast';
  import JumpLink from '$lib/shared/ui/content/jump/JumpLink.svelte';

  interface Props {
    node: Inline;
  }

  let { node }: Props = $props();
</script>

{#snippet renderInline(n: Inline)}
  {#if n.type === 'text'}
    {#if n.value.includes('\n')}
      {#each n.value.split('\n') as line, i (i)}
        {#if i > 0}<br />{/if}{line}
      {/each}
    {:else}
      {n.value}
    {/if}
  {:else if n.type === 'inlineCode'}
    <code>{n.value}</code>
  {:else if n.type === 'strong'}
    <strong>
      {#each n.children as child}
        {@render renderInline(child)}
      {/each}
    </strong>
  {:else if n.type === 'emphasis'}
    <em>
      {#each n.children as child}
        {@render renderInline(child)}
      {/each}
    </em>
  {:else if n.type === 'link'}
    <JumpLink className="link link-primary" url={n.url}>
      {#each n.children as child}
        {@render renderInline(child)}
      {/each}
    </JumpLink>
  {/if}
{/snippet}

{@render renderInline(node)}
