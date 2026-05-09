<script lang="ts">
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Info as LInfo } from 'lucide';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    title: string;
    lines: string[];
    align?: 'start' | 'end';
    widthClass?: string;
  }

  let {
    title,
    lines,
    align = 'end',
  }: Props = $props();
</script>

<details style="position:relative;display:inline-block;">
  <summary
    style="
      width:24px;height:24px;border-radius:9999px;border:0;
      background:transparent;cursor:pointer;
      display:inline-flex;align-items:center;justify-content:center;
      list-style:none;
    "
    aria-label={title}
    title={title}
  >
    <Lucide icon={LInfo} size={15} style="color:{T.inkFaint};" ariaLabel="" />
  </summary>

  <div style="
    position:absolute;{align === 'end' ? 'right:0' : 'left:0'};top:calc(100% + 6px);
    z-index:50;width:280px;
    background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
    box-shadow:{T.shadow.xs};padding:12px 14px;
  ">
    <div style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">{title}</div>
    <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;">
      {#each lines as line}
        <li style="font-size:12px;color:{T.inkBody};line-height:1.5;">{line}</li>
      {/each}
    </ul>
  </div>
</details>

<style>
  summary::-webkit-details-marker { display: none; }
</style>
