<script lang="ts">
  import { T } from './tokens.js';
  import Avatar from './Avatar.svelte';

  interface Props {
    seeds: string[];
    size?: number;
  }
  let { seeds, size = 24 }: Props = $props();
</script>

<span style="display: inline-flex;">
  {#each seeds as seed, i}
    <span style="margin-left: {i ? -(size * 0.35) : 0}px; border: 2px solid {T.surface}; border-radius: 50%; display: inline-block; flex-shrink: 0;">
      <Avatar {seed} {size} />
    </span>
  {/each}
</span>
