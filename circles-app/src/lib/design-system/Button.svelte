<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    iconRight?: string;
    full?: boolean;
    disabled?: boolean;
    style?: string;
    onclick?: () => void;
    children?: Snippet;
  }

  let { variant = 'primary', size = 'md', icon, iconRight, full, disabled, style = '', onclick, children }: Props = $props();

  const sizes = $derived({
    sm: { h: 32, px: 12, fz: 13, gap: 6, ix: 14 },
    md: { h: 40, px: 16, fz: 14, gap: 8, ix: 16 },
    lg: { h: 48, px: 22, fz: 15, gap: 10, ix: 18 },
  }[size]);

  const variants = $derived({
    primary:   { bg: T.primary,      color: '#fff',         border: 'transparent', shadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(15,10,30,0.12)' },
    secondary: { bg: T.surface,      color: T.ink,          border: T.hairline,    shadow: T.shadow.xs },
    ghost:     { bg: 'transparent',  color: T.inkBody,      border: 'transparent', shadow: 'none' },
    soft:      { bg: T.primarySoft,  color: T.primaryDeep,  border: 'transparent', shadow: 'none' },
    danger:    { bg: T.negativeSoft, color: T.negative,     border: 'transparent', shadow: 'none' },
  }[variant]);
</script>

<button
  {disabled}
  onclick={onclick}
  style="
    height: {sizes.h}px; padding: 0 {sizes.px}px; border-radius: 9999px;
    background: {variants.bg}; color: {variants.color};
    border: 1px solid {variants.border}; box-shadow: {variants.shadow};
    font-family: {T.fontSans}; font-size: {sizes.fz}px; font-weight: 540;
    letter-spacing: -0.005em; cursor: {disabled ? 'not-allowed' : 'pointer'};
    display: inline-flex; align-items: center; justify-content: center; gap: {sizes.gap}px;
    width: {full ? '100%' : 'auto'}; opacity: {disabled ? 0.5 : 1};
    transition: transform .08s ease-out, box-shadow .15s ease-out, background .15s ease-out;
    white-space: nowrap;
    {style}
  "
>
  {#if icon}<Icon name={icon} size={sizes.ix} strokeWidth={1.8} />{/if}
  {@render children?.()}
  {#if iconRight}<Icon name={iconRight} size={sizes.ix} strokeWidth={1.8} />{/if}
</button>
