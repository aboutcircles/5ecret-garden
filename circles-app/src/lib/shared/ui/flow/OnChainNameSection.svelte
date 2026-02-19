<script lang="ts">
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
      {value}
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
        />
      </label>
      <p class="text-xs text-base-content/60">
        On-chain names follow stricter rules (ASCII only, max 32 characters).
      </p>
      {#if invalid}
        <p class="text-xs text-error">{invalidMessage}</p>
      {/if}
    </div>
  {/if}
</div>
