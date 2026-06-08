<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  interface Props {
    value?: string;
    sourceValue?: string;
    placeholder?: string;
    summaryWhenEmpty?: string;
    invalid?: boolean;
    invalidMessage?: string;
    // On-chain byte cap. Default 32 matches the gateway shape; pass 19 from
    // the group flow to match BaseGroupFactory's stricter requirement.
    maxBytes?: number;
  }

  let {
    value = $bindable(''),
    sourceValue = '',
    placeholder = 'On-chain name…',
    summaryWhenEmpty = 'Derived from the profile name',
    invalid = false,
    invalidMessage,
    maxBytes = 32,
  }: Props = $props();

  const effectiveInvalidMessage = $derived(
    invalidMessage ??
      `Only ASCII letters, numbers, spaces, and - _ . ( ) ' & + # are allowed (max ${maxBytes} chars).`
  );

  let open = $state(false);
  let manual = $state(false);
  let initialized = $state(false);

  function truncateAscii(v: string, max: number): string {
    return v.length <= max ? v : v.slice(0, max);
  }

  function deriveOnChainName(v: string): string {
    const trimmed = (v ?? '').trim();
    if (!trimmed) return '';
    const sanitized = trimmed.replace(/[^0-9A-Za-z \-_.()'&+#]/g, '');
    return truncateAscii(sanitized, maxBytes);
  }

  function sanitizedFull(v: string): string {
    const trimmed = (v ?? '').trim();
    if (!trimmed) return '';
    return trimmed.replace(/[^0-9A-Za-z \-_.()'&+#]/g, '');
  }

  // True when the auto-derived on-chain name had to be cut off to fit the
  // contract's byte cap. Shown in the collapsed summary so the user knows
  // their on-chain name will differ from the off-chain profile name.
  const derivationTruncated = $derived(
    !manual && sanitizedFull(sourceValue).length > maxBytes
  );

  $effect(() => {
    if (!initialized) {
      const derived = deriveOnChainName(sourceValue);
      manual = !!value && value !== derived;
      initialized = true;
    }
    if (!manual) {
      value = deriveOnChainName(sourceValue);
    }
  });
</script>

<div style="border:1px solid {T.hairlineSoft};border-radius:14px;background:{T.surfaceAlt};padding:14px 16px;">
  <button
    type="button"
    onclick={() => (open = !open)}
    style="
      display:flex;align-items:center;justify-content:space-between;width:100%;
      background:transparent;border:0;padding:0;cursor:pointer;text-align:left;
    "
  >
    <span style="font-size:13px;font-weight:580;color:{T.ink};">On-chain name</span>
    <span style="display:inline-flex;color:{T.inkMuted};transform:rotate({open ? 180 : 0}deg);transition:transform .15s ease-out;">
      <Icon name="chevronDown" size={14} stroke={T.inkMuted} />
    </span>
  </button>

  <div style="margin-top:6px;font-size:12px;color:{T.inkMuted};">
    {#if value}
      <span style="font-family:{T.fontMono};color:{T.inkBody};">{value}</span>
      {#if derivationTruncated}
        <span class="ml-1 text-warning">· truncated to {maxBytes} chars from profile name</span>
      {/if}
    {:else}
      {summaryWhenEmpty}
    {/if}
  </div>

  {#if open}
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
      <label style="display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:{T.inkBody};cursor:pointer;">
        <input
          type="checkbox"
          style="width:14px;height:14px;accent-color:{T.primary};"
          checked={manual}
          onchange={(e) => {
            manual = (e.currentTarget as HTMLInputElement).checked;
            if (!manual) value = deriveOnChainName(sourceValue);
          }}
        />
        Set on-chain name manually
      </label>

      <div>
        <span style="font-size:11px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">On-chain name</span>
        <input
          style="width:100%;height:32px;padding:0 10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontSans};font-size:13px;color:{T.ink};background:{T.surface};outline:none;margin-top:6px;"
          bind:value
          {placeholder}
          disabled={!manual}
          maxlength={maxBytes}
        />
      </div>

      <p style="font-size:11.5px;color:{T.inkMuted};line-height:1.5;margin:0;">
        On-chain names follow stricter rules (ASCII only, max {maxBytes} characters).
      </p>
      {#if invalid}
        <p style="font-size:11.5px;color:{T.negative};margin:0;">{effectiveInvalidMessage}</p>
      {/if}
    </div>
  {/if}
</div>
