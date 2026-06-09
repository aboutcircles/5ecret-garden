<script lang="ts">
  import { T } from './tokens.js';
  import type { Snippet } from 'svelte';

  type PillColor = 'lilac' | 'sage' | 'coral' | 'butter' | 'rose' | 'neutral' | 'ink' | 'subtle' | 'positive' | 'negative';

  interface Props {
    color?: PillColor | string;
    style?: string;
    children?: Snippet;
  }

  let { color = 'lilac', style = '', children }: Props = $props();

  const map: Record<PillColor, [string, string]> = {
    lilac:    [T.primarySoft,  T.primaryDeep],
    sage:     [T.sageSoft,    '#1F5E37'],
    coral:    [T.coralSoft,   '#8A3A1E'],
    butter:   [T.butterSoft,  '#7B5215'],
    rose:     [T.roseSoft,    '#7C2A4A'],
    neutral:  [T.pageDeep,    T.inkBody],
    ink:      [T.ink,         T.butter],
    subtle:   [T.surfaceAlt,  T.inkMuted],
    positive: [T.positiveSoft, T.positive],
    negative: [T.negativeSoft, T.negative],
  };

  const [bg, fg] = $derived(map[color as PillColor] ?? map.lilac);
</script>

<span style="
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 9999px;
  background: {bg}; color: {fg};
  font-family: {T.fontSans}; font-size: 11.5px; font-weight: 580;
  letter-spacing: 0.01em; white-space: nowrap;
  {style}
">{@render children?.()}</span>
