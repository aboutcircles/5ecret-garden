<script lang="ts">
  import { popupControls, popupState } from '$lib/stores/popUp';

  // Close on Escape for better a11y
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && $popupState.content) {
      popupControls.close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Bottom sheet container (unchanged behavior) -->
<div
  class="popup rounded-t-lg overflow-y-auto"
  class:open={$popupState.content !== null}
  role="dialog"
  aria-modal="true"
  aria-labelledby="popup-title"
>
  <div class="w-full p-4 sm:w-[90%] lg:w-3/5 relative">
    <!-- Header actions -->
    <div class="absolute left-4 top-4">
      <button
        class="btn btn-ghost btn-circle btn-sm"
        onclick={() => {
          if ($popupState.stack.length > 0) {
            popupControls.back();
          } else {
            popupControls.close();
          }
        }}
        aria-label={$popupState.stack.length > 0 ? 'Back' : 'Close'}
        title={$popupState.stack.length > 0 ? 'Back' : 'Close'}
      >
        <img
          alt={$popupState.stack.length > 0 ? 'Back' : 'Close'}
          src={$popupState.stack.length > 0 ? '/arrow-left.svg' : '/close.svg'}
          class="w-4 h-4"
        />
      </button>
    </div>

    <div class="content mt-2 w-full">
      {#if $popupState.content}
        {@const SvelteComponent = $popupState.content.component}
        <div class="mt-14">
          <p id="popup-title" class="text-xl font-bold mb-4">
            {$popupState.content.title}
          </p>
          <SvelteComponent {...$popupState.content.props} />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .popup {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 80%;
    min-height: 80%;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: white;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    transform: translateY(100%);
    opacity: 0;
    z-index: 20; /* keep above the layout overlay (z-10) */
  }
  .popup.open {
    transform: translateY(0);
    opacity: 1;
  }
</style>
