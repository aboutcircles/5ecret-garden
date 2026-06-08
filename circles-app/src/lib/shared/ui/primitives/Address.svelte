<script lang="ts">
  import { shortenAddress } from '$lib/shared/utils/shared';
  import type { Address } from '@aboutcircles/sdk-types';

  let copyIcon = $state('/copy.svg');
  interface Props {
    address: Address;
    // When true, render the full 0x… address (no shortening). Inline variant
    // — no button chrome — so it composes inside flowing banner text.
    full?: boolean;
    // When true, render a small explorer-link icon next to the address.
    explorer?: boolean;
  }

  let { address, full = false, explorer = false }: Props = $props();
  let copyFailed = $state(false);

  async function handleCopy() {
    // Clipboard write can fail or be unavailable:
    //  - navigator.clipboard undefined (older mobile, http:// dev mirrors)
    //  - permission denied (iOS Safari without user gesture, some iframes)
    //  - document not focused (Firefox in some embeds)
    // Only flip to the success icon when the write actually resolved; on
    // failure surface a small visual signal so the user doesn't silently
    // paste nothing.
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable in this browser context');
      }
      await navigator.clipboard.writeText(address);
      copyIcon = '/check.svg';
      copyFailed = false;
    } catch (e) {
      console.warn('[Address] Clipboard write failed:', e);
      copyFailed = true;
    }

    setTimeout(() => {
      copyIcon = '/copy.svg';
      copyFailed = false;
    }, 1500);
  }
</script>

{#if full}
  <span class="inline-flex items-center gap-1 align-baseline">
    <button
      type="button"
      onclick={handleCopy}
      title={copyFailed ? 'Copy failed — select and copy manually' : 'Copy address'}
      class="font-mono break-all underline decoration-dotted hover:opacity-70 cursor-pointer"
    >
      {address}
    </button>
    {#if copyFailed}
      <span class="text-error text-xs shrink-0" title="Clipboard blocked by browser">!</span>
    {:else}
      <img src={copyIcon} alt="Copy" class="w-3 h-3 inline shrink-0" />
    {/if}
    {#if explorer}
      <a
        href="https://gnosisscan.io/address/{address}"
        target="_blank"
        rel="noopener noreferrer"
        title="View on Gnosisscan"
        class="opacity-60 hover:opacity-100 shrink-0"
        aria-label="View on Gnosisscan"
      >
        ↗
      </a>
    {/if}
  </span>
{:else}
  <button
    onclick={handleCopy}
    class="btn btn-sm"
    title={copyFailed ? 'Copy failed — select and copy manually' : 'Copy address'}
  >
    {shortenAddress(address)}
    {#if copyFailed}
      <span class="text-error text-xs">!</span>
    {:else}
      <img src={copyIcon} alt="Copy" class="w-4 h-4 inline" />
    {/if}
  </button>
{/if}
