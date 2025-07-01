<script lang="ts">
  import { popupControls, popupState } from '$lib/stores/popUp';
  import { onMount } from 'svelte';

  let modalElement: HTMLDialogElement;

  // Handle modal open/close state
  $effect(() => {
    if ($popupState.content && modalElement) {
      modalElement.showModal();
    } else if (!$popupState.content && modalElement) {
      modalElement.close();
    }
  });

  // Handle ESC key and backdrop clicks
  const handleModalClick = (event: MouseEvent) => {
    if (event.target === modalElement) {
      handleClose();
    }
  };

  const handleClose = () => {
    if ($popupState.stack.length > 0) {
      popupControls.back();
    } else {
      popupControls.close();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<!-- Modern DaisyUI Modal -->
<dialog 
  bind:this={modalElement}
  class="modal modal-open"
  class:modal-open={$popupState.content !== null}
  onclick={handleModalClick}
>
  <div class="modal-box w-11/12 max-w-2xl bg-white border border-circles-border shadow-xl">
    <!-- Modal Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        {#if $popupState.stack.length > 0}
          <button
            class="btn btn-ghost btn-sm btn-circle"
            onclick={() => popupControls.back()}
            aria-label="Back"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        {/if}
        
        {#if $popupState.content?.title}
          <h2 class="text-xl font-semibold text-circles-text">
            {$popupState.content.title}
          </h2>
        {/if}
      </div>

      <button
        class="btn btn-ghost btn-sm btn-circle"
        onclick={handleClose}
        aria-label="Close"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Modal Content -->
    <div class="modal-content">
      {#if $popupState.content}
        {@const SvelteComponent = $popupState.content.component}
        <SvelteComponent {...$popupState.content.props} />
      {/if}
    </div>
  </div>
  
  <!-- Modal Backdrop -->
  <form method="dialog" class="modal-backdrop bg-black/50">
    <button onclick={handleClose}>close</button>
  </form>
</dialog>
