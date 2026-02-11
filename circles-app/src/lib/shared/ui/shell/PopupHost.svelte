<!-- src/lib/components/Popup.svelte -->
<script lang="ts">
    import { popupControls, popupState } from '$lib/shared/state/popup';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { ArrowLeft as LArrowLeft, X as LX } from 'lucide';

    function isEditableEl(el: Element | null): boolean {
        if (!(el instanceof HTMLElement)) return false;

        // Contenteditable (includes many rich text editors)
        if (el.isContentEditable) return true;

        const tag = el.tagName;
        if (tag === 'TEXTAREA' || tag === 'SELECT') return true;

        if (tag === 'INPUT') {
            const input = el as HTMLInputElement;
            // Most input types are editable; exclude ones where backspace is not "text editing"
            const nonTextTypes = new Set([
                'button',
                'checkbox',
                'color',
                'file',
                'hidden',
                'image',
                'radio',
                'range',
                'reset',
                'submit'
            ]);
            return !nonTextTypes.has((input.type || '').toLowerCase());
        }

        // ARIA textbox used by some custom inputs/editors
        if (el.getAttribute('role') === 'textbox') return true;

        return false;
    }

    function isEditableTarget(target: EventTarget | null, e: KeyboardEvent): boolean {
        // Prefer composedPath (shadow DOM) when available
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        for (const p of path) {
            if (p instanceof Element && isEditableEl(p)) return true;
        }

        // Fallback: walk up from target
        let node: Element | null = target instanceof Element ? target : null;
        while (node) {
            if (isEditableEl(node)) return true;
            node = node.parentElement;
        }

        return false;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!$popupState.content) return;

        if (e.key === 'Escape') {
            popupControls.close();
            return;
        }

        // Backspace navigates popup stack (but never closes the last popup)
        if (e.key === 'Backspace') {
            // Don’t interfere with typing/editing
            if (isEditableTarget(e.target, e)) return;

            // Don’t treat modified Backspace as navigation
            if (e.altKey || e.ctrlKey || e.metaKey) return;

            // Only pop if there is a previous popup
            if ($popupState.stack.length > 0) {
                e.preventDefault();
                popupControls.back();
            }
            // If this is the last popup, do nothing
        }
    }

    function onClose() {
        if ($popupState.stack.length > 0) popupControls.back();
        else popupControls.close();
    }

    function closeAll() {
        popupControls.close();
    }

    // Keep *all* pages mounted: stack + current
    let pages = $derived([
        ...($popupState.stack ?? []),
        ...($popupState.content ? [$popupState.content] : [])
    ]);

    let top = $derived(Math.max(0, pages.length - 1));

    const showTitle = $derived(Boolean($popupState.content?.title) && !$popupState.content?.hideTitle);

    // Guarantee keys are unique and stable per page object
    const _ids = new WeakMap<any, string>();
    let _seq = 0;
    function keyFor(page: any): string {
        if (page?.key != null) return String(page.key);
        if (page?.id != null) return String(page.id);
        const got = _ids.get(page);
        if (got) return got;
        const id = `pg-auto-${++_seq}`;
        _ids.set(page, id);
        return id;
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="popup-shell" class:open={$popupState.content !== null}>
    <button
        type="button"
        class="popup-backdrop"
        onclick={closeAll}
        aria-label="Close popup"
        tabindex={-1}
    ></button>

    <div
        class="popup rounded-t-lg overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={showTitle ? 'popup-title' : undefined}
        aria-label={!showTitle ? ($popupState.content?.title ?? 'Popup') : undefined}
    >
        <div class="w-full max-w-4xl mx-auto p-6">
            <!-- Header -->
            <div class="flex items-center gap-3 mb-4">
                <button
                        class="btn btn-ghost btn-circle btn-sm"
                        onclick={onClose}
                        aria-label={$popupState.stack.length > 0 ? 'Back' : 'Close'}
                        title={$popupState.stack.length > 0 ? 'Back' : 'Close'}
                >
                    <Lucide
                            icon={$popupState.stack.length > 0 ? LArrowLeft : LX}
                            size={16}
                            class="shrink-0 stroke-black"
                            ariaLabel=""
                    />
                </button>

                {#if showTitle}
                    <h2 id="popup-title" class="text-xl font-bold">
                        {$popupState.content.title}
                    </h2>
                {/if}
            </div>

            <!-- Content: render the whole stack; only top is visible -->
            <div class="content w-full relative">
                {#each pages as page, i (keyFor(page))}
                    {@const Component = page.component}
                    <div
                            class={`popup-page ${i === top ? 'is-top' : 'is-hidden'}`}
                            aria-hidden={i === top ? 'false' : 'true'}
                            inert={i !== top}
                    >
                        <Component {...page.props} />
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .popup-shell {
        position: fixed;
        inset: 0;
        z-index: 100;
        pointer-events: none;
    }

    .popup-shell.open {
        pointer-events: auto;
    }

    .popup-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        border: none;
        padding: 0;
        margin: 0;
        opacity: 0;
        transition: opacity .3s ease;
        pointer-events: none;
        z-index: 100;
    }

    .popup-shell.open .popup-backdrop {
        opacity: 1;
        pointer-events: auto;
    }

    .popup {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        max-height: 80%;
        min-height: 80%;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: white;
        transition: transform .3s ease, opacity .3s ease;
        transform: translateY(100%);
        opacity: 0;
        z-index: 101;
        pointer-events: auto;
    }

    .popup-shell.open .popup {
        transform: translateY(0);
        opacity: 1;
    }

    /* Keep instances mounted; hide non-top pages */
    .popup-page { position: relative; }
    .popup-page.is-hidden { display: none; }
    .popup-page.is-top { display: block; }
</style>
