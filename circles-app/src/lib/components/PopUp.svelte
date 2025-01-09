<script lang="ts">
  import { popupControls, popupState } from '$lib/stores/popUpStore';

  $: console.log('Popup content:', $popupState);
</script>

<div
  class="popup"
  class:open={$popupState.content !== null}
  role="dialog"
  aria-modal="true"
>
  <div class="popup-content">
    <button on:click={popupControls.back}>
      {#if $popupState.stack.length > 0}
        Back
      {:else}
        Close
      {/if}
    </button>

    {#if $popupState.content}
      <svelte:component this={$popupState.content.component} {...$popupState.content.props} />
    {/if}
  </div>
</div>

<style>
  .popup {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 80%;
    background: white;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    transform: translateY(100%);
    opacity: 0;
    z-index: 20;
  }
  .popup.open {
    transform: translateY(0);
    opacity: 1;
  }
</style>
