<script lang="ts">
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

<div class="border border-base-200 rounded-xl p-3">
  <button
    type="button"
    class="flex items-center justify-between w-full text-xs font-semibold text-left"
    onclick={() => (open = !open)}
  >
    <span>On-chain name</span>
    <span class={open ? 'rotate-180 transition-transform' : 'transition-transform'}>
      <img src="/chevron-down.svg" alt="Toggle" class="w-4 h-4" />
    </span>
  </button>

  <div class="mt-1 text-xs text-base-content/60">
    {#if value}
      <span>{value}</span>
      {#if derivationTruncated}
        <span class="ml-1 text-warning">· truncated to {maxBytes} chars from profile name</span>
      {/if}
    {:else}
      {summaryWhenEmpty}
    {/if}
  </div>

  {#if open}
    <div class="mt-3 space-y-2">
      <label class="flex items-center gap-2 text-xs">
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

      <label class="form-control w-full">
        <span class="label-text text-xs">On-chain name</span>
        <input
          class="input input-sm input-bordered w-full"
          bind:value
          {placeholder}
          disabled={!manual}
          maxlength={maxBytes}
        />
      </label>
      <p class="text-xs text-base-content/60">
        On-chain names follow stricter rules (ASCII only, max {maxBytes} characters).
      </p>
      {#if invalid}
        <p class="text-xs text-error">{effectiveInvalidMessage}</p>
      {/if}
    </div>
  {/if}
</div>
