<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';

  interface Props {
    seed?: string;
    size?: number;
    image?: string;
    kind?: 'gradient' | 'token' | 'group';
    icon?: string;
    label?: string;
    ring?: string | boolean;
    style?: string;
  }

  let { seed = 'x', size = 40, image, kind = 'gradient', icon, label, ring, style = '' }: Props = $props();

  const hue = $derived(() => {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 360;
  });

  const grad = $derived(`linear-gradient(135deg, hsl(${hue()} 70% 72%), hsl(${(hue() + 40) % 360} 65% 58%))`);

  const bg = $derived(
    image ? 'transparent'
    : kind === 'token' ? '#0F0A1E'
    : kind === 'group' ? T.primaryFaint
    : grad
  );

  const ringStyle = $derived(
    ring ? `0 0 0 2px ${T.surface}, 0 0 0 ${2 + (ring === true ? 2 : 2)}px ${ring === true ? T.primary : ring}` : 'none'
  );

  const initials = $derived((label || seed)[0]?.toUpperCase() ?? '?');
</script>

<div style="
  width: {size}px; height: {size}px; border-radius: 50%;
  background: {bg}; overflow: hidden; position: relative; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: {ringStyle};
  {style}
">
  {#if image}
    <img src={image} alt="" style="width:100%;height:100%;object-fit:cover;" />
  {:else if kind === 'token'}
    <svg width={size * 0.85} height={size * 0.85} viewBox="0 0 24 24" fill="none">
      <path d="M12 4a8 8 0 1 0 0 16V4Z" fill="#fff" />
      <circle cx="12" cy="12" r="3.2" fill="#0F0A1E" />
    </svg>
  {:else if kind === 'group'}
    <Icon name="contacts" size={size * 0.45} stroke="rgba(15,10,30,0.55)" strokeWidth={1.8} />
  {:else if icon}
    <Icon name={icon} size={size * 0.5} stroke="#fff" strokeWidth={1.8} />
  {:else}
    <span style="
      font-family: {T.fontSans}; font-size: {size * 0.42}px; font-weight: 600; color: #fff;
      letter-spacing: 0.02em; text-transform: uppercase;
    ">{initials}</span>
  {/if}
</div>
