<script lang="ts">
    import { setContext, tick, createEventDispatcher } from 'svelte';
    import { writable, type Readable } from 'svelte/store';
    import { TABS_CTX, type TabRegistration, type TabsContext } from './tabs.context';

    let uidCounter = 0;
    function nextUid() {
        uidCounter += 1;
        return `tabs-${uidCounter}`;
    }

    type Variant = 'plain' | 'bordered' | 'lifted' | 'boxed';
    type Size = 'xs' | 'sm' | 'md' | 'lg';

    // Bindable props
    let {
        selected = $bindable<string | null>(null),   // external (optional) controlled value
        defaultValue = null as string | null,
        variant = 'bordered' as Variant,
        size = 'md' as Size,
        fitted = false,
        class: className = '',
        id = nextUid(),
    } = $props();

    const dispatch = createEventDispatcher<{ change: string }>();

    // Internal registry of tabs
    let tabs = $state<TabRegistration[]>([]);

    // Internal active id that actually drives UI
    let active = $state<string | null>(selected ?? null);

    // Keep internal active in sync if parent controls `selected`
    $effect(() => {
        const external = selected;
        const hasExternal = external !== null;
        const differs = external !== active;

        if (hasExternal && differs) {
            active = external;
        }
    });

    function updateOrInsertTab(info: TabRegistration) {
        const i = tabs.findIndex((t) => t.id === info.id);
        if (i === -1) {
            tabs = [...tabs, info];
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
        tabs = next;
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
                    dispatch('change', null as unknown as string);
                }
            }
        };
    }

    function isSelected(id_: string): boolean {
        return active === id_;
    }

    function select(id_: string, focus = false): void {
        const tgt = tabs.find((t) => t.id === id_ && !t.disabled);
        if (!tgt) return;

        const changed = active !== id_;
        if (changed) {
            active = id_;
            // mirror to bindable prop so parent sees updates
            selected = id_;
            dispatch('change', id_);
        }

        if (focus) {
            void tick().then(() => {
                const el = document.querySelector<HTMLElement>(`#${id}-tab-${CSS.escape(id_)}`);
                el?.focus();
            });
        }
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
        if (key === 'ArrowRight' || key === 'ArrowDown') { e.preventDefault(); move(1); return; }
        if (key === 'ArrowLeft'  || key === 'ArrowUp')   { e.preventDefault(); move(-1); return; }
        if (key === 'Home')                              { e.preventDefault(); select(enabled[0].id, true); return; }
        if (key === 'End')                               { e.preventDefault(); select(enabled[enabled.length - 1].id, true); return; }
    }

    // Reactive selected via store for children
    const selectedStore = writable<string | null>(active);
    $effect(() => {
        selectedStore.set(active);
    });

    const ctx: TabsContext = {
        register,
        isSelected,
        select,
        selected$: selectedStore as Readable<string | null>,
        hostId: id
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
            fitted ? 'grid grid-flow-col auto-cols-fr' : '',
            className
        ].filter(Boolean).join(' ')
    );
</script>

<div
        role="tablist"
        id={id}
        aria-orientation="horizontal"
        class={tablistClasses}
        on:keydown={onKeydown}
>
    {#each tabs as t (t.id)}
        <button
                type="button"
                role="tab"
                id={`${id}-tab-${t.id}`}
                class="tab"
                class:tab-active={active === t.id}
                class:tab-disabled={t.disabled}
                aria-selected={active === t.id}
                aria-controls={`${id}-panel-${t.id}`}
                tabindex={active === t.id ? 0 : -1}
                disabled={t.disabled}
                on:click={() => { select(t.id); }}
                data-tab-id={t.id}
                aria-label={t.badge !== undefined ? `${t.title} (${t.badge})` : t.title}
        >
      <span class="inline-flex items-center gap-2">
        {t.title}
          {#if t.badge !== undefined}
          <span class="badge badge-sm">{t.badge}</span>
        {/if}
      </span>
        </button>
    {/each}
</div>

<div>
    <slot />
</div>
