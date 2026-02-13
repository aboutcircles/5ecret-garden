<script lang="ts">
  interface Props {
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    showCancel?: boolean;
    confirmClass?: string;
  }

  let {
    message,
    onConfirm,
    onCancel = () => {},
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    showCancel = true,
    confirmClass = 'btn btn-primary btn-sm',
  }: Props = $props();
</script>

<div class="w-full max-w-xl mx-auto py-2">
  <p class="text-base text-base-content/85 whitespace-pre-line">{message}</p>

  <div class="mt-5 flex justify-end gap-2">
    {#if showCancel}
      <button type="button" class="btn btn-ghost btn-sm" onclick={onCancel}> {cancelLabel} </button>
    {/if}
    <button type="button" class={confirmClass} onclick={onConfirm}>{confirmLabel}</button>
  </div>
</div>
