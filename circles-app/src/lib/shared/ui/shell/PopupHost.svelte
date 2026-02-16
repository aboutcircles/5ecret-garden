<!-- src/lib/components/Popup.svelte -->
<script lang="ts">
    import { popupControls, popupState, resolvePopupDismiss } from '$lib/shared/state/popup';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { ArrowLeft as LArrowLeft, X as LX } from 'lucide';
    import { focusElement, shouldAutoFocusTextInput } from '$lib/shared/ui/focus/focusPolicy';
    import CloseConfirmStep from '$lib/shared/ui/shell/CloseConfirmStep.svelte';

    let popupEl: HTMLDivElement | null = $state(null);
    let previouslyFocusedEl: HTMLElement | null = null;
    let wasOpen = false;
    let lastTopPageKey = '';
    const CLOSE_CONFIRM_ID = '__close_confirm_step__';

    const FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    function getFocusableElements(scope: ParentNode | null): HTMLElement[] {
        if (!scope) return [];
        const all = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        return all.filter((el) => {
            if (el.hasAttribute('disabled')) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            if (el.getClientRects().length === 0) return false;
            return true;
        });
    }

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

    function shouldTrackDirtyTarget(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;
        if (target.closest('[data-popup-dirty-ignore="true"]')) return false;

        const editable = target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
        if (!(editable instanceof HTMLElement)) return false;
        if (editable instanceof HTMLInputElement) {
            const nonDataTypes = new Set([
                'button',
                'submit',
                'reset',
                'image',
                'file',
            ]);
            if (nonDataTypes.has((editable.type || '').toLowerCase())) return false;
            if (editable.readOnly || editable.disabled) return false;
            return true;
        }
        if (editable instanceof HTMLTextAreaElement || editable instanceof HTMLSelectElement) {
            return !(editable.readOnly || editable.disabled);
        }
        return true;
    }

    function isCloseConfirmOpen(): boolean {
        return $popupState.content?.id === CLOSE_CONFIRM_ID;
    }

    function pushCloseConfirmStep(): void {
        if (isCloseConfirmOpen()) return;

        popupControls.open({
            id: CLOSE_CONFIRM_ID,
            key: CLOSE_CONFIRM_ID,
            kind: 'confirm',
            dismiss: 'explicit',
            hideTitle: true,
            component: CloseConfirmStep,
            props: {
                message: 'Do you really want to close the form?',
                onYes: () => popupControls.close(),
                onNo: () => popupControls.back(),
            },
        });
    }

    function attemptClose(source: 'backdrop' | 'escape' | 'header'): void {
        const content = $popupState.content;
        if (!content) return;

        if (isCloseConfirmOpen()) {
            if (source === 'backdrop' || source === 'escape') {
                popupControls.back();
            }
            return;
        }

        const dismiss = resolvePopupDismiss(content);
        if (dismiss === 'explicit' && (source === 'backdrop' || source === 'escape')) {
            if (content.isDirty) {
                pushCloseConfirmStep();
            } else {
                popupControls.close();
            }
            return;
        }

        if (dismiss === 'confirmIfDirty' && content.isDirty) {
            pushCloseConfirmStep();
            return;
        }

        popupControls.close();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!$popupState.content) return;

        if (e.key === 'Tab') {
            const focusables = getFocusableElements(popupEl);
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (!active || active === first || !popupEl?.contains(active)) {
                    e.preventDefault();
                    focusElement(last);
                }
            } else if (!active || active === last || !popupEl?.contains(active)) {
                e.preventDefault();
                focusElement(first);
            }
            return;
        }

        if (e.key === 'Escape') {
            attemptClose('escape');
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
        else attemptClose('header');
    }

    function closeAll() {
        attemptClose('backdrop');
    }

    // Keep *all* pages mounted: stack + current
    let pages = $derived([
        ...($popupState.stack ?? []),
        ...($popupState.content ? [$popupState.content] : [])
    ]);

    type PageKeyEntry = { page: any; key: string };
    const pagesWithKeys = $derived((): PageKeyEntry[] => {
        const entries: PageKeyEntry[] = [];
        const seen = new Map<string, number>();
        for (const page of pages) {
            const base = keyFor(page);
            const count = seen.get(base) ?? 0;
            seen.set(base, count + 1);
            const key = count === 0 ? base : `${base}::${count}`;
            entries.push({ page, key });
        }
        return entries;
    });

    let top = $derived(Math.max(0, pages.length - 1));

    const showTitle = $derived(Boolean($popupState.content?.title) && !$popupState.content?.hideTitle);
    const popupTitleText = $derived($popupState.content?.title ?? 'Popup');

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

    $effect(() => {
        const isOpen = Boolean($popupState.content);
        if (isOpen && !wasOpen) {
            previouslyFocusedEl = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        }

        if (!isOpen && wasOpen) {
            focusElement(previouslyFocusedEl);
            previouslyFocusedEl = null;
            lastTopPageKey = '';
        }

        wasOpen = isOpen;
    });

    $effect(() => {
        if (!$popupState.content || !popupEl) return;

        const topPage = popupEl.querySelector<HTMLElement>('.popup-page.is-top');
        if (!topPage) return;

        const pageKey = topPage.dataset.popupPageKey ?? '';
        if (pageKey === lastTopPageKey) return;
        lastTopPageKey = pageKey;

        queueMicrotask(() => {
            const active = document.activeElement as HTMLElement | null;
            if (active && topPage.contains(active)) return;

            const preferred = shouldAutoFocusTextInput()
                ? (
                    topPage.querySelector<HTMLElement>('[data-popup-initial-input], [data-send-step-initial-input]')
                    ?? topPage.querySelector<HTMLElement>('[data-popup-initial-focus], [data-send-step-initial-focus]')
                )
                : topPage.querySelector<HTMLElement>('[data-popup-initial-focus], [data-send-step-initial-focus]');

            if (preferred) {
                focusElement(preferred);
                return;
            }

            const fallback = popupEl?.querySelector<HTMLElement>('[data-popup-close-control], #popup-title');
            focusElement(fallback);
        });
    });

    $effect(() => {
        if (!popupEl) return;

        const markDirtyIfNeeded = (event: Event) => {
            const content = $popupState.content;
            if (!content) return;
            if (isCloseConfirmOpen()) return;
            if ((content.isDirty ?? false) === true) return;
            if (resolvePopupDismiss(content) !== 'explicit') return;
            if (!shouldTrackDirtyTarget(event.target)) return;
            popupControls.markCurrentDirty();
        };

        popupEl.addEventListener('input', markDirtyIfNeeded, true);
        popupEl.addEventListener('change', markDirtyIfNeeded, true);

        return () => {
            popupEl?.removeEventListener('input', markDirtyIfNeeded, true);
            popupEl?.removeEventListener('change', markDirtyIfNeeded, true);
        };
    });
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
        bind:this={popupEl}
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
                        data-popup-close-control
                        class="btn btn-ghost btn-circle btn-sm"
                        onclick={onClose}
                        aria-label={$popupState.stack.length > 0 ? 'Back' : 'Close'}
                        title={$popupState.stack.length > 0 ? 'Back' : 'Close'}
                >
                    <Lucide
                            icon={$popupState.stack.length > 0 ? LArrowLeft : LX}
                            size={16}
                            class="shrink-0"
                            ariaLabel=""
                    />
                </button>

                {#if showTitle}
                    <h2 id="popup-title" class="text-xl font-bold">
                        {popupTitleText}
                    </h2>
                {/if}
            </div>

            <div class="content w-full relative">
                {#each pagesWithKeys() as entry, i (entry.key)}
                    {@const page = entry.page}
                    {@const Component = page.component}
                    <div
                            class={`popup-page ${i === top ? 'is-top' : 'is-hidden'}`}
                            data-popup-page-key={entry.key}
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
        background: oklch(var(--b1));
        border-top: 1px solid oklch(var(--b3) / 0.55);
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
        box-shadow: 0 -8px 24px oklch(var(--bc) / 0.08);
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
