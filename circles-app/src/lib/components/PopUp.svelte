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
</script>

<svelte:window onkeydown={handleKeydown} />

<div
        class="popup rounded-t-lg overflow-y-auto"
        class:open={$popupState.content !== null}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
>
    <!-- widen to match page--lg -->
    <div class="w-full max-w-4xl mx-auto p-6">
        <!-- Header row: close/back button aligned left of title -->
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

        <div class="content w-full">
            {#if $popupState.content}
                {@const SvelteComponent = $popupState.content.component}
                <SvelteComponent {...$popupState.content.props} />
            {/if}
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
</style>
