<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    showHeader?: boolean;
    onSubmit: () => Promise<void> | void;
    onCancel?: () => void;
    loading?: boolean;
    submitDisabled?: boolean;
    submitLabel?: string;
    children?: Snippet;
  }

  let {
    title,
    subtitle = '',
    showHeader = true,
    onSubmit,
    onCancel,
    loading = false,
    submitDisabled = false,
    submitLabel = 'Save',
    children,
  }: Props = $props();

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void onSubmit();
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if showHeader}
    <div>
      <h3 class="text-lg font-semibold">{title}</h3>
      {#if subtitle}
        <p class="text-sm opacity-70 mt-1">{subtitle}</p>
      {/if}
    </div>
  {/if}

  <div class="space-y-3">
    {@render children?.()}
  </div>

  <div class="flex items-center justify-end gap-2 pt-2">
    {#if onCancel}
      <button type="button" class="btn btn-ghost btn-sm" onclick={onCancel} disabled={loading}>
        Cancel
      </button>
    {/if}
    <button type="submit" class="btn btn-primary btn-sm" disabled={loading || submitDisabled}>
      {#if loading}
        <span class="loading loading-spinner loading-xs"></span>
      {/if}
      {submitLabel}
    </button>
  </div>
</form>
