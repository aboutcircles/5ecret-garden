<script lang="ts">
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Info as LInfo } from 'lucide';

  interface Props {
    title: string;
    lines: string[];
    align?: 'start' | 'end';
    widthClass?: string;
    buttonClass?: string;
    contentClass?: string;
  }

  let {
    title,
    lines,
    align = 'end',
    widthClass = 'w-80',
    buttonClass = 'btn btn-ghost btn-xs btn-square',
    contentClass = 'bg-base-100 border border-base-300 rounded-xl shadow-lg p-3'
  }: Props = $props();
</script>

<details class={`dropdown ${align === 'end' ? 'dropdown-end' : 'dropdown-start'}`.trim()}>
  <summary
    class={`${buttonClass} list-none`.trim()}
    aria-label={title}
    title={title}
  >
    <Lucide icon={LInfo} size={16} class="text-base-content/40 hover:text-base-content/70" ariaLabel="" />
  </summary>

  <div class={`dropdown-content z-50 mt-2 ${widthClass} ${contentClass}`.trim()}>
    <div class="text-xs font-semibold text-base-content/70">{title}</div>
    <ul class="mt-2 space-y-1 text-xs text-base-content/80">
      {#each lines as line}
        <li>{line}</li>
      {/each}
    </ul>
  </div>
</details>

<style>
  summary::-webkit-details-marker { display: none; }
</style>
