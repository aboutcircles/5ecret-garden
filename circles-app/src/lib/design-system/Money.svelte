<script lang="ts">
  import { T } from './tokens.js';

  interface Props {
    value: number;
    unit?: string;
    signed?: boolean;
    size?: number;
    weight?: number;
    color?: string;
    style?: string;
  }

  let { value, unit = 'CRC', signed, size = 14, weight = 580, color, style = '' }: Props = $props();

  const num = $derived(Number(value));
  const abs = $derived(Math.abs(num));
  const sign = $derived(signed ? (num >= 0 ? '+' : '−') : '');
  const tone = $derived(signed ? (num >= 0 ? T.positive : T.negative) : (color || T.ink));
  const formatted = $derived(
    abs >= 1
      ? abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : abs < 0.01 ? '< 0.01' : abs.toFixed(2)
  );
</script>

<span style="
  font-family: {T.fontSans}; font-size: {size}px; font-weight: {weight};
  font-variant-numeric: tabular-nums; color: {tone};
  letter-spacing: -0.01em; white-space: nowrap;
  {style}
">
  {sign}{formatted}<span style="margin-left: 4px; font-size: {size * 0.78}px; font-weight: 500; color: {signed ? tone : T.inkMuted}; opacity: {signed ? 0.85 : 1};">{unit}</span>
</span>
