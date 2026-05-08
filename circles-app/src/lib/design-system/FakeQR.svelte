<script lang="ts">
  import { T } from './tokens.js';
  interface Props { size?: number; }
  let { size = 156 }: Props = $props();

  const cells: {i: number, j: number}[] = [];
  const seed = (i: number, j: number) => ((i * 73 + j * 31 + i * j) % 7) > 2;
  for (let i = 0; i < 17; i++) for (let j = 0; j < 17; j++) {
    if (seed(i, j) && !((i < 4 && j < 4) || (i < 4 && j > 12) || (i > 12 && j < 4))) {
      cells.push({i, j});
    }
  }
</script>

<svg width={size} height={size} viewBox="0 0 156 156">
  {#each cells as {i, j}}
    <rect x={j * 7 + 12} y={i * 7 + 12} width={5} height={5} rx={1} fill={T.butter} />
  {/each}
  <!-- Anchor TL -->
  <rect x={8} y={8} width={28} height={28} rx={4} fill={T.butter} />
  <rect x={14} y={14} width={16} height={16} rx={2} fill={T.ink} />
  <rect x={18} y={18} width={8} height={8} rx={1} fill={T.butter} />
  <!-- Anchor TR -->
  <rect x={120} y={8} width={28} height={28} rx={4} fill={T.butter} />
  <rect x={126} y={14} width={16} height={16} rx={2} fill={T.ink} />
  <rect x={130} y={18} width={8} height={8} rx={1} fill={T.butter} />
  <!-- Anchor BL -->
  <rect x={8} y={120} width={28} height={28} rx={4} fill={T.butter} />
  <rect x={14} y={126} width={16} height={16} rx={2} fill={T.ink} />
  <rect x={18} y={130} width={8} height={8} rx={1} fill={T.butter} />
  <!-- Center logo -->
  <circle cx="78" cy="78" r="13" fill={T.ink} />
  <circle cx="78" cy="78" r="9" fill={T.butter} />
  <circle cx="78" cy="78" r="4" fill={T.ink} />
</svg>
