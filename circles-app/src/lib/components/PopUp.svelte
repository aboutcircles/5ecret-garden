<!-- src/lib/components/PopUp.svelte -->
<script lang="ts">
    import { popupControls, popupState } from '$lib/stores/popUp';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ArrowLeft as LArrowLeft, X as LX } from 'lucide';

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && $popupState.content) popupControls.close();
    }

    function onClose() {
        if ($popupState.stack.length > 0) popupControls.back();
        else popupControls.close();
    }

    // Keep *all* pages mounted: stack + current
    let pages = $derived([
        ...($popupState.stack ?? []),
        ...($popupState.content ? [$popupState.content] : [])
    ]);

    let top = $derived(Math.max(0, pages.length - 1));

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

<div
        class="popup rounded-t-lg overflow-y-auto"
        class:open={$popupState.content !== null}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
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

            {#if $popupState.content?.title}
                <h2 id="popup-title" class="text-xl font-bold">
                    {$popupState.content.title}
                </h2>
            {/if}
        </div>

        <!-- Content: render the whole stack; only top is visible -->
        <div class="content w-full relative">
            {#each pages as page, i (keyFor(page))}
                <div
                        class={`popup-page ${i === top ? 'is-top' : 'is-hidden'}`}
                        aria-hidden={i === top ? 'false' : 'true'}
                        inert={i !== top}
                >
                    <svelte:component this={page.component} {...page.props} />
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .popup {
        position: fixed;
        bottom: 0; left: 0; width: 100%;
        max-height: 80%; min-height: 80%;
        display: flex; flex-direction: column; align-items: center;
        background: white;
        transition: transform .3s ease, opacity .3s ease;
        transform: translateY(100%); opacity: 0;
        z-index: 100;
    }
    .popup.open { transform: translateY(0); opacity: 1; }

    /* Keep instances mounted; hide non-top pages */
    .popup-page { position: relative; }
    .popup-page.is-hidden { display: none; }
    .popup-page.is-top { display: block; }
</style>
