<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

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

<div style="width:100%;max-width:560px;margin:0 auto;padding:8px 0;display:flex;flex-direction:column;gap:16px;">
  <label style="display:flex;flex-direction:column;gap:6px;">
    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">{label}</span>
    <input
      type="text"
      style="width:100%;padding:10px 14px;border:1px solid {error ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:13px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
      bind:value
      {placeholder}
      data-popup-initial-input
      onkeydown={onKeydown}
    />
  </label>

  {#if error}
    <p style="font-size:12px;color:{T.negative};margin:0;">{error}</p>
  {/if}

  <div style="display:flex;justify-content:flex-end;gap:8px;">
    <button
      type="button"
      style="height:36px;padding:0 16px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:13px;cursor:pointer;"
      onclick={onCancel}
    >{cancelLabel}</button>
    <button
      type="button"
      style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:{!error ? T.primary : T.pageDeep};color:{!error ? '#fff' : T.inkMuted};font-size:13px;font-weight:580;cursor:{!error ? 'pointer' : 'not-allowed'};box-shadow:{!error ? '0 4px 12px rgba(88,73,212,0.25)' : 'none'};"
      disabled={!!error}
      onclick={submit}
    >{confirmLabel}</button>
  </div>
</div>
