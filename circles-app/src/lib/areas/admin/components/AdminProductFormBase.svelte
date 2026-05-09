<script lang="ts">
  import { T } from '$lib/design-system/tokens';
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

<form onsubmit={handleSubmit} style="display:flex;flex-direction:column;gap:16px;">
  {#if showHeader}
    <div>
      <h3 style="font-size:17px;font-weight:580;color:{T.ink};margin:0;">{title}</h3>
      {#if subtitle}
        <p style="font-size:13px;color:{T.inkMuted};margin:4px 0 0;">{subtitle}</p>
      {/if}
    </div>
  {/if}

  <div style="display:flex;flex-direction:column;gap:12px;">
    {@render children?.()}
  </div>

  <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:8px;">
    {#if onCancel}
      <button type="button" style="height:32px;padding:0 18px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:12.5px;font-weight:580;cursor:pointer;" onclick={onCancel} disabled={loading}>
        Cancel
      </button>
    {/if}
    <button type="submit" style="height:32px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;box-shadow:0 4px 12px rgba(88,73,212,0.25);display:inline-flex;align-items:center;gap:6px;" disabled={loading || submitDisabled}>
      {#if loading}
        <svg class="apfb-spin" style="width:12px;height:12px;color:#fff;" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
      {/if}
      {submitLabel}
    </button>
  </div>
</form>

<style>
  @keyframes apfb-spin { from {} to { transform: rotate(360deg); } }
  .apfb-spin { animation: apfb-spin 0.8s linear infinite; }
</style>