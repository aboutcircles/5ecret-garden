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
  }

  let {
    value = $bindable(''),
    sourceValue = '',
    placeholder = 'On-chain name…',
    summaryWhenEmpty = 'Derived from the profile name',
    invalid = false,
    invalidMessage = "Only ASCII letters, numbers, spaces, and - _ . ( ) ' & + # are allowed (max 32 chars).",
  }: Props = $props();

  let open = $state(false);
  let manual = $state(false);
  let initialized = $state(false);

  function truncateAscii(v: string, maxBytes: number): string {
    return v.length <= maxBytes ? v : v.slice(0, maxBytes);
  }

  function deriveOnChainName(v: string): string {
    const trimmed = (v ?? '').trim();
    if (!trimmed) return '';
    const sanitized = trimmed.replace(/[^0-9A-Za-z \-_.()'&+#]/g, '');
    return truncateAscii(sanitized, 32);
  }

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
    <span style="display:inline-flex;color:{T.inkMuted};transform:rotate({open ? 180 : 0}deg);transition:transform .15s;">
      <Icon name="chevronDown" size={14} stroke={T.inkMuted} />
    </span>
  </button>

  <div style="margin-top:6px;font-size:12px;color:{T.inkMuted};">
    {#if value}
      <span style="font-family:{T.fontMono};color:{T.inkBody};">{value}</span>
    {:else}
      {summaryWhenEmpty}
    {/if}
  </div>

  {#if open}
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
      <label style="display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:{T.inkBody};cursor:pointer;">
        <input
          type="checkbox"
          class="checkbox checkbox-xs"
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
          class="input input-sm input-bordered w-full mt-1.5"
          bind:value
          {placeholder}
          disabled={!manual}
        />
      </div>

      <p style="font-size:11.5px;color:{T.inkMuted};line-height:1.5;margin:0;">
        On-chain names follow stricter rules (ASCII only, max 32 characters).
      </p>
      {#if invalid}
        <p style="font-size:11.5px;color:{T.negative};margin:0;">{invalidMessage}</p>
      {/if}
    </div>
  {/if}
</div>
