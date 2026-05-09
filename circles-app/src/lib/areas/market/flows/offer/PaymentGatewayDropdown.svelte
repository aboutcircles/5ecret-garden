<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { T } from '$lib/design-system/tokens.js';

  type Props = {
    options: string[];
    value?: string;
    placeholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
  };

  let {
    options = [],
    value = $bindable(''),
    placeholder = 'Select payment gateway',
    ariaLabel = 'Payment gateway',
    disabled = false,
  }: Props = $props();

  let rootEl: HTMLDivElement | null = $state(null);
  let triggerEl: HTMLButtonElement | null = $state(null);
  let open = $state(false);
  let activeIndex = $state(-1);

  const selectedIndex = $derived(options.indexOf(value));

  function asAddress(s: string | undefined): Address | undefined {
    return s as unknown as Address;
  }

  async function focusActiveOption(): Promise<void> {
    await tick();
    if (!rootEl || activeIndex < 0) {
      return;
    }
    const target = rootEl.querySelector<HTMLButtonElement>(`[data-gateway-option="${activeIndex}"]`);
    target?.focus();
  }

  async function openMenu(focus: 'selected' | 'first' = 'selected'): Promise<void> {
    if (disabled || options.length === 0) {
      return;
    }
    open = true;
    if (focus === 'first') {
      activeIndex = 0;
    } else {
      activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    }
    await focusActiveOption();
  }

  function closeMenu(refocusTrigger = false): void {
    open = false;
    if (refocusTrigger) {
      triggerEl?.focus();
    }
  }

  function selectIndex(index: number): void {
    if (index < 0 || index >= options.length) {
      return;
    }
    value = options[index];
    closeMenu(true);
  }

  function moveActive(delta: number): void {
    if (!open || options.length === 0) {
      return;
    }
    const base = activeIndex >= 0 ? activeIndex : 0;
    const next = (base + delta + options.length) % options.length;
    activeIndex = next;
    void focusActiveOption();
  }

  async function onTriggerKeydown(e: KeyboardEvent): Promise<void> {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      await openMenu('first');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      await openMenu('selected');
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) {
        closeMenu();
      } else {
        await openMenu('selected');
      }
    }
  }

  function onListKeydown(e: KeyboardEvent): void {
    if (!open) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      activeIndex = 0;
      void focusActiveOption();
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      activeIndex = options.length - 1;
      void focusActiveOption();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectIndex(activeIndex >= 0 ? activeIndex : 0);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu(true);
      return;
    }
    if (e.key === 'Tab') {
      closeMenu(false);
    }
  }

  onMount(() => {
    function onDocumentPointerDown(e: PointerEvent): void {
      if (!open || !rootEl) {
        return;
      }
      const target = e.target as Node | null;
      if (target && !rootEl.contains(target)) {
        closeMenu(false);
      }
    }

    function onDocumentKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        closeMenu(true);
      }
    }

    document.addEventListener('pointerdown', onDocumentPointerDown, true);
    document.addEventListener('keydown', onDocumentKeydown, true);
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      document.removeEventListener('keydown', onDocumentKeydown, true);
    };
  });
</script>

<div style="position:relative;width:100%;" bind:this={rootEl}>
  <button
    bind:this={triggerEl}
    type="button"
    style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 14px;border:1px solid {T.hairline};border-radius:10px;background:{T.surface};cursor:pointer;font-family:{T.fontSans};font-size:13px;color:{T.ink};text-align:left;opacity:{disabled ? 0.6 : 1};"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={ariaLabel}
    disabled={disabled}
    onclick={() => (open ? closeMenu(false) : openMenu('selected'))}
    onkeydown={onTriggerKeydown}
  >
    {#if value}
      <span style="min-width:0;flex:1;text-align:left;">
        <Avatar
          address={asAddress(value)}
          view="horizontal"
          bottomInfo={value}
          clickable={false}
        />
      </span>
    {:else}
      <span style="opacity:0.7;color:{T.inkMuted};">{placeholder}</span>
    {/if}
  </button>

  {#if open}
    <ul
      style="position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:20;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:12px;padding:8px;box-shadow:{T.shadow.xs};list-style:none;margin:0;"
      role="listbox"
      aria-label={ariaLabel}
      onkeydown={onListKeydown}
    >
      {#each options as option, index}
        {@const isSelected = option === value}
        <li role="option" aria-selected={isSelected}>
          <button
            type="button"
            data-gateway-option={index}
            class="gw-option"
            tabindex={index === activeIndex ? 0 : -1}
            data-active={index === activeIndex ? 'true' : 'false'}
            onclick={() => selectIndex(index)}
            onfocus={() => { activeIndex = index; }}
            onmouseenter={() => { activeIndex = index; }}
          >
            <Avatar address={asAddress(option)} view="horizontal" bottomInfo={option} clickable={false} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .gw-option {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    text-align: left;
  }
  .gw-option:hover,
  .gw-option:focus-visible,
  .gw-option[data-active='true'] {
    background: rgba(88,73,212,0.06);
    outline: none;
  }
</style>
