<script lang="ts">
  import { setContext, tick, createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  import { writable, type Readable } from 'svelte/store';
  import { TABS_CTX, type TabRegistration, type TabsContext } from './tabs.context';

  let uidCounter = 0;
  function nextUid() {
    uidCounter += 1;
    return `tabs-${uidCounter}`;
  }

  type Variant = 'plain' | 'bordered' | 'lifted' | 'boxed';
  type Size = 'xs' | 'sm' | 'md' | 'lg';

  type Props = {
    selected?: string | null;
    defaultValue?: string | null;
    variant?: Variant;
    size?: Size;
    fitted?: boolean;
    class?: string;
    id?: string;
    tabOrder?: string[];
    children?: Snippet;
  };

  // Bindable props
  let {
    selected = $bindable<string | null>(null),   // external (optional) controlled value
    defaultValue = null as string | null,
    variant = 'bordered' as Variant,
    size = 'md' as Size,
    fitted = false,
    class: className = '',
    id = nextUid(),
    tabOrder = undefined as string[] | undefined,
    children
  }: Props = $props();

  const dispatch = createEventDispatcher<{ change: string | null }>();

  // Internal registry of tabs
  let tabs = $state<TabRegistration[]>([]);

  // Internal active id that actually drives UI
  let active = $state<string | null>(selected ?? null);

  // When Tabs is used in a controlled mode (selected != null), there can be a short period
  // after a click where `active` is updated locally, but the parent `selected` prop still
  // contains the previous value (until navigation/state updates). Without a guard, the sync
  // effect below would immediately overwrite the clicked tab with the old external value,
  // producing a “needs a second click” feel.
  let pendingExternalAck = $state<string | null>(null);

  // Keep internal active in sync if parent controls `selected`
  $effect(() => {
    const external = selected;
    const hasExternal = external !== null;
    const differs = external !== active;

    if (!hasExternal) return;

    if (pendingExternalAck !== null) {
      // Parent acknowledged our last request — clear ack and follow.
      if (external === pendingExternalAck) {
        pendingExternalAck = null;
        if (differs) active = external;
        return;
      }
      // Parent moved to a value other than our pending ack (URL change,
      // popstate, programmatic select). Treat as authoritative override
      // so we never get stuck waiting for an ack that won't arrive.
      pendingExternalAck = null;
    }

    if (differs) {
      active = external;
    }
  });

  function sortTabs(list: TabRegistration[]): TabRegistration[] {
    if (!tabOrder || tabOrder.length === 0) return list;
    const orderMap = new Map(tabOrder.map((id_, idx) => [id_, idx] as const));
    return list.slice().sort((a, b) => {
      const aIdx = orderMap.get(a.id);
      const bIdx = orderMap.get(b.id);
      if (aIdx === undefined && bIdx === undefined) return 0;
      if (aIdx === undefined) return 1;
      if (bIdx === undefined) return -1;
      return aIdx - bIdx;
    });
  }

  function updateOrInsertTab(info: TabRegistration) {
    const i = tabs.findIndex((t) => t.id === info.id);
    if (i === -1) {
      tabs = sortTabs([...tabs, info]);
      return;
    }
    const prev = tabs[i];
    const changed =
      prev.title !== info.title ||
      prev.disabled !== info.disabled ||
      prev.badge !== info.badge;

    if (!changed) return;

    const next = tabs.slice();
    next[i] = info;
    tabs = sortTabs(next);
  }

  function register(info: TabRegistration): () => void {
    updateOrInsertTab(info);

    const hasActive = active !== null;
    if (!hasActive) {
      const wantDefault = !!defaultValue && info.id === defaultValue;
      const isFirst = !defaultValue && tabs.length === 1;
      if (wantDefault || isFirst) {
        select(info.id);
      }
    }

    return () => {
      const wasSelected = active === info.id;
      const filtered = tabs.filter((t) => t.id !== info.id);
      if (filtered.length !== tabs.length) {
        tabs = filtered;
      }

      if (wasSelected) {
        const remainingEnabled = tabs.filter((t) => !t.disabled);
        const next = remainingEnabled[0]?.id ?? null;
        if (next !== null) {
          select(next);
        } else {
          active = null;
          selected = null;
          dispatch('change', null);
        }
      }
    };
  }

  function isSelected(id_: string): boolean {
    return active === id_;
  }

  function isTabVisible(id_: string): boolean {
    if (!scroller) return true;
    const el = document.querySelector<HTMLElement>(`#${id}-tab-${CSS.escape(id_)}`);
    if (!el) return true;
    const left = el.offsetLeft;
    const right = el.offsetLeft + el.offsetWidth;
    const viewLeft = scroller.scrollLeft;
    const viewRight = scroller.scrollLeft + scroller.clientWidth;
    return left >= viewLeft && right <= viewRight;
  }

  function centerOnTabId(id_: string, behavior: ScrollBehavior = 'smooth') {
    if (!scroller) return;
    const el = document.querySelector<HTMLElement>(`#${id}-tab-${CSS.escape(id_)}`);
    if (!el) return;
    if (isTabVisible(id_)) return;
    const elCenter = el.offsetLeft + el.offsetWidth / 2;
    const containerCenter = scroller.clientWidth / 2;
    const target = Math.max(0, Math.min(elCenter - containerCenter, scroller.scrollWidth - scroller.clientWidth));
    scroller.scrollTo({ left: target, behavior });
  }

  function select(id_: string, focus = false): void {
    const tgt = tabs.find((t) => t.id === id_ && !t.disabled);
    if (!tgt) return;

    const changed = active !== id_;
    if (changed) {
      active = id_;
      pendingExternalAck = id_;
      // mirror to bindable prop so parent sees updates
      selected = id_;
      dispatch('change', id_);
    }

    void tick().then(() => {
      centerOnTabId(id_);
      if (focus) {
        const el = document.querySelector<HTMLElement>(`#${id}-tab-${CSS.escape(id_)}`);
        el?.focus();
      }
    });
  }

  function onKeydown(e: KeyboardEvent): void {
    const enabled = tabs.filter((t) => !t.disabled);
    if (enabled.length === 0) return;

    const idx = enabled.findIndex((t) => t.id === active);
    const move = (n: number) => {
      const i = (idx + n + enabled.length) % enabled.length;
      select(enabled[i].id, true);
    };

    const key = e.key;
    if (key === 'ArrowRight') { e.preventDefault(); move(1); return; }
    if (key === 'ArrowLeft')  { e.preventDefault(); move(-1); return; }
    if (key === 'ArrowDown')  { e.preventDefault(); focusFirstBelowTabs(); return; }
    if (key === 'ArrowUp')    { e.preventDefault(); focusLastAboveTabs(); return; }
    if (key === 'Home')                              { e.preventDefault(); select(enabled[0].id, true); return; }
    if (key === 'End')                               { e.preventDefault(); select(enabled[enabled.length - 1].id, true); return; }
  }

  // Reactive selected via store for children
  const selectedStore = writable<string | null>(null);
  $effect(() => {
    selectedStore.set(active);
  });

  // Center the active tab whenever it changes (also covers external controlled `selected` changes)
  $effect(() => {
    const id_ = active;
    if (!id_) return;
    void tick().then(() => {
      centerOnTabId(id_);
    });
  });

  const ctx: TabsContext = {
    register,
    isSelected,
    select,
    selected$: selectedStore as Readable<string | null>,
    get hostId() { return id; }
  };
  setContext(TABS_CTX, ctx);

  // computed classes (Svelte 5 runes)
  let tablistClasses = $derived(
    [
      'tabs',
      variant === 'bordered' ? 'tabs-bordered' : '',
      variant === 'lifted' ? 'tabs-lifted' : '',
      variant === 'boxed' ? 'tabs-boxed' : '',
      size === 'xs' ? 'tabs-xs' : size === 'sm' ? 'tabs-sm' : size === 'lg' ? 'tabs-lg' : '',
      // make tabs horizontally scrollable when there are many
      'overflow-x-auto whitespace-nowrap',
      // Layout: use grid only when fitted, otherwise a left-aligned flex row
      fitted ? 'grid grid-flow-col auto-cols-fr' : 'flex flex-nowrap justify-start',
      className
    ].filter(Boolean).join(' ')
  );

  // Consistent tab heights per size to avoid layout jumps between states
  let buttonSizeClass = $derived(
    size === 'xs' ? 'h-6' : size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10'
  );

  // Scroll indicators state
  let scroller: HTMLDivElement | null = null;
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);
  let tabsNavEl: HTMLDivElement | null = null;
  let panelsEl: HTMLDivElement | null = null;

  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusable(scope: ParentNode | null): HTMLElement[] {
    if (!scope) return [];
    const all = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    return all.filter((el) => el.getClientRects().length > 0 && !el.hasAttribute('disabled'));
  }

  function focusFirstBelowTabs(): void {
    const inPanels = getFocusable(panelsEl);
    if (inPanels.length > 0) {
      inPanels[0]?.focus();
      return;
    }

    const all = getFocusable(document);
    const afterTabs = all.find((el) => {
      if (!tabsNavEl) return false;
      const pos = tabsNavEl.compareDocumentPosition(el);
      return Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    afterTabs?.focus();
  }

  function focusLastAboveTabs(): void {
    const all = getFocusable(document).filter((el) => !tabsNavEl?.contains(el));
    const beforeTabs = all.filter((el) => {
      if (!tabsNavEl) return false;
      const pos = tabsNavEl.compareDocumentPosition(el);
      return Boolean(pos & Node.DOCUMENT_POSITION_PRECEDING);
    });
    beforeTabs[beforeTabs.length - 1]?.focus();
  }

  function updateScrollShadows() {
    if (!scroller) return;
    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    canScrollLeft = scrollLeft > 0;
    canScrollRight = scrollLeft + clientWidth < scrollWidth - 1;
  }

  function onScroll() {
    updateScrollShadows();
  }

  function nudge(dir: number) {
    if (!scroller) return;
    const amount = Math.max(120, Math.floor(scroller.clientWidth * 0.6));
    scroller.scrollBy({ left: amount * dir, behavior: 'smooth' });
  }

  let resizeObserver: ResizeObserver | null = null;
  onMount(() => {
    // initialize after first render
    setTimeout(updateScrollShadows, 0);
    if (scroller && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => updateScrollShadows());
      resizeObserver.observe(scroller);
    }
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });
</script>

<div class="relative" bind:this={tabsNavEl}>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-base-300 z-0"></div>

  <div class={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-base-100 to-transparent transition-opacity duration-150 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}></div>
  <div class={`pointer-events-none absolute left-0 bottom-0 w-10 h-6 bg-gradient-to-b from-base-100 to-transparent transition-opacity duration-150 z-10 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}></div>
  <!-- Intentionally excluded from keyboard tab order: tabs are fully keyboard navigable via tab buttons + arrow keys. -->
  <button
      type="button"
      class={`btn btn-ghost btn-xs absolute left-1 top-1/2 -translate-y-1/2 z-10 ${canScrollLeft ? '' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!canScrollLeft}
      tabindex={-1}
      onclick={() => nudge(-1)}
  >
    <img src="/chevron-right.svg" alt="Scroll left" class="w-4 h-4 rotate-180" />
  </button>

  <div class={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-base-100 to-transparent transition-opacity duration-150 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}></div>
  <div class={`pointer-events-none absolute right-0 bottom-0 w-10 h-6 bg-gradient-to-b from-base-100 to-transparent transition-opacity duration-150 z-10 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}></div>
  <!-- Intentionally excluded from keyboard tab order: tabs are fully keyboard navigable via tab buttons + arrow keys. -->
  <button
      type="button"
      class={`btn btn-ghost btn-xs absolute right-1 top-1/2 -translate-y-1/2 z-10 ${canScrollRight ? '' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!canScrollRight}
      tabindex={-1}
      onclick={() => nudge(1)}
  >
    <img src="/chevron-right.svg" alt="Scroll right" class="w-4 h-4" />
  </button>

  <div
      role="tablist"
      tabindex="-1"
      id={id}
      aria-orientation="horizontal"
      class={tablistClasses}
      onkeydown={onKeydown}
      bind:this={scroller}
      onscroll={onScroll}
  >
    {#each tabs as t (t.id)}
      <button
          type="button"
          role="tab"
          id={`${id}-tab-${t.id}`}
          data-popup-initial-focus={active === t.id ? 'true' : undefined}
          class={`tab ${buttonSizeClass} flex-none whitespace-nowrap min-w-max max-w-[calc(100%-4rem)] overflow-hidden`}
          class:tab-active={active === t.id}
          class:tab-disabled={t.disabled}
          aria-selected={active === t.id}
          aria-controls={`${id}-panel-${t.id}`}
          tabindex={active === t.id ? 0 : -1}
          disabled={t.disabled}
          onclick={() => { select(t.id); }}
          data-tab-id={t.id}
          aria-label={t.badge !== undefined ? `${t.title} (${t.badge})` : t.title}
      >
                <span class="inline-flex items-center gap-2 max-w-full">
                    <span class="truncate">{t.title}</span>
                  {#if t.badge !== undefined}
                        <span class="badge badge-sm flex-none">{t.badge}</span>
                    {/if}
                </span>
      </button>
    {/each}
  </div>
</div>

<div bind:this={panelsEl}>
  {@render children?.()}
</div>
