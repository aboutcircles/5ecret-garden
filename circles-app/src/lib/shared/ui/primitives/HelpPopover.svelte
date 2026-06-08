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
    widthClass = 'w-72',
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
  style="width:24px;height:24px;border-radius:9999px;border:0;background:transparent;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
  aria-label={title}
  title={open ? undefined : title}
  onclick={toggle}
>
  <span style="color:{T.inkFaint};display:inline-flex;"><Lucide icon={LInfo} size={15} ariaLabel="" /></span>
</button>

{#if open}
  <div
    use:teleport
    bind:this={popoverEl}
    style="position:fixed;z-index:9999;width:280px;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;box-shadow:{T.shadow.xs};padding:12px 14px;{style}"
    role="tooltip"
  >
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.05em;text-transform:uppercase;">{title}</span>
      <button
        type="button"
        style="width:20px;height:20px;border-radius:6px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;opacity:0.6;"
        onclick={close}
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
    <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;">
      {#each lines as line}
        <li style="font-size:12px;color:{T.inkBody};line-height:1.5;">{line}</li>
      {/each}
    </ul>
  </div>
{/if}
