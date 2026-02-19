<script lang="ts">
  interface Props {
    label: string;
    initialValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    validate?: (value: string) => string | null;
    onConfirm: (value: string) => void;
    onCancel: () => void;
  }

  let {
    label,
    initialValue = '',
    placeholder = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    validate,
    onConfirm,
    onCancel,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initialValue);
  const error = $derived(validate?.(value) ?? null);

  function submit(): void {
    if (error) return;
    onConfirm(value);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submit();
  }
</script>

<div class="w-full max-w-xl mx-auto py-2 space-y-4">
  <label class="form-control w-full">
    <span class="label-text mb-1">{label}</span>
    <input
      type="text"
      class="input input-bordered w-full"
      bind:value
      {placeholder}
      data-popup-initial-input
      onkeydown={onKeydown}
    />
  </label>

  {#if error}
    <p class="text-sm text-error">{error}</p>
  {/if}

  <div class="mt-5 flex justify-end gap-2">
    <button type="button" class="btn btn-ghost btn-sm" onclick={onCancel}>{cancelLabel}</button>
    <button type="button" class="btn btn-primary btn-sm" disabled={!!error} onclick={submit}>{confirmLabel}</button>
  </div>
</div>
