<script lang="ts">
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Info as LInfo } from 'lucide';

  interface Props {
    title: string;
    lines: string[];
    align?: 'start' | 'end';
    widthClass?: string;
    buttonClass?: string;
  }

  let {
    title,
    lines,
    align = 'end',
    widthClass = 'w-72',
    buttonClass = 'btn btn-ghost btn-xs btn-square',
  }: Props = $props();

  let open = $state(false);
  let triggerEl: HTMLButtonElement | null = $state(null);
  let popoverEl: HTMLDivElement | null = $state(null);
  let style = $state('');

  function reposition() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const popoverWidth = 288; // w-72 = 18rem
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 220;

    // Horizontal: align with button edge, clamped to viewport
    let left: number;
    if (align === 'start') {
      left = rect.left;
    } else {
      left = rect.right - popoverWidth;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));

    if (above) {
      style = `bottom: ${window.innerHeight - rect.top + gap}px; left: ${left}px;`;
    } else {
      style = `top: ${rect.bottom + gap}px; left: ${left}px;`;
    }
  }

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    if (open) { close(); return; }
    reposition();
    open = true;
  }

  function close() { open = false; }

  function handleClickOutside(e: MouseEvent) {
    if (triggerEl?.contains(e.target as Node)) return;
    if (popoverEl?.contains(e.target as Node)) return;
    close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  function handleScroll() { close(); }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleKeydown);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('click', handleClickOutside, true);
        document.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  });

  /** Move the node to document.body so it escapes overflow clipping */
  function teleport(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }
</script>

<button
  bind:this={triggerEl}
  type="button"
  class={buttonClass}
  aria-label={title}
  title={open ? undefined : title}
  onclick={toggle}
>
  <Lucide icon={LInfo} size={16} class="text-base-content/40 hover:text-base-content/70" ariaLabel="" />
</button>

{#if open}
  <div
    use:teleport
    bind:this={popoverEl}
    class="fixed z-[9999] {widthClass} bg-base-100 border border-base-300 rounded-xl shadow-lg p-4"
    {style}
    role="tooltip"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="font-semibold text-sm">{title}</span>
      <button type="button" class="btn btn-ghost btn-xs btn-square opacity-60 hover:opacity-100" onclick={close} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
    <ul class="space-y-1.5 text-sm text-base-content/70 leading-snug">
      {#each lines as line}
        <li>{line}</li>
      {/each}
    </ul>
  </div>
{/if}
