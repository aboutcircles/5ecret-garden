<script lang="ts">
    import { getContext, onDestroy } from 'svelte';
    import { TABS_CTX, type TabsContext } from './tabs.context';

    const ctx = getContext<TabsContext>(TABS_CTX);
    const { register, isSelected } = ctx;

    function slug(s: string) {
        return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    let {
        id = '',
        title = '',
        badge = undefined as number | string | undefined,
        disabled = false,
        // do not use daisyUI "tab-content" here; it hides panels in the radio variant
        panelClass = '',
        // still accepted for compatibility; if omitted, we take it from context
        hostId = undefined as string | undefined,
    } = $props();

    // derive a stable id when not given
    $effect(() => {
        if (!id) {
            id = slug(title || 'tab');
        }
    });

    // subscribe to selection changes (reactive for this child)
    let selectedId: string | null = $state(null);
    let unsub: (() => void) | null = null;
    $effect(() => {
        if (ctx.selected$ && !unsub) {
            unsub = ctx.selected$?.subscribe((v) => {
                selectedId = v;
            }) ?? null;
        }
    });

    // register with parent; update only when metadata changes
    let unregister: (() => void) | null = null;
    let prev: { id: string; title: string; disabled: boolean; badge?: number | string } | null = null;

    $effect(() => {
        const current = { id, title, disabled, badge };

        if (prev === null) {
            unregister = register(current);
            prev = { ...current };
            return;
        }

        const idChanged = prev.id !== current.id;
        const metaChanged =
            idChanged || prev.title !== current.title || prev.disabled !== current.disabled || prev.badge !== current.badge;

        if (!metaChanged) {
            return;
        }

        if (idChanged) {
            unregister?.();
            unregister = register(current);
        } else {
            register(current); // parent update is idempotent
        }

        prev = { ...current };
    });

    onDestroy(() => {
        unsub?.();
        unregister?.();
    });

    // compute active state; if store present use it, else fall back to parent's function
    let isActive = $derived(
        ctx.selected$ ? (selectedId === id) : isSelected(id)
    );

    let effectiveHostId = $derived(hostId ?? ctx.hostId ?? 'tabs');
</script>

<div
        role="tabpanel"
        id={`${effectiveHostId}-panel-${id}`}
        aria-labelledby={`${effectiveHostId}-tab-${id}`}
        class={panelClass}
        hidden={!isActive}
        aria-hidden={!isActive}
>
    <slot />
</div>
