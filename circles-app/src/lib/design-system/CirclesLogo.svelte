<script lang="ts">
  import { T } from './tokens.js';
  interface Props { size?: number; }
  let { size = 28 }: Props = $props();
</script>

<span style="display: inline-flex; align-items: center; gap: 9px;">
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M16 4a12 12 0 1 0 0 24V4Z" fill={T.coral} />
    <path d="M16 4a12 12 0 1 1 0 24V4Z" fill={T.primary} />
    <circle cx="16" cy="16" r="5" fill={T.page} />
  </svg>
  <span style="font-family: {T.fontSans}; font-weight: 600; font-size: {size * 0.62}px; color: {T.ink}; letter-spacing: -0.01em;">Circles</span>
</span>
