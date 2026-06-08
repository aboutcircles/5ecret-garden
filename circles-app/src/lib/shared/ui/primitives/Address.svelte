<script lang="ts">
  import { shortenAddress } from '$lib/shared/utils/shared';
  import type { Address } from '@aboutcircles/sdk-types';
  import { T } from '$lib/design-system/tokens.js';

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
  <span style="display:inline-flex;align-items:center;gap:4px;vertical-align:baseline;">
    <button
      type="button"
      onclick={handleCopy}
      title={copyFailed ? 'Copy failed — select and copy manually' : 'Copy address'}
      style="font-family:monospace;word-break:break-all;text-decoration:underline;text-decoration-style:dotted;cursor:pointer;background:none;border:0;color:{T.ink};padding:0;"
    >
      {address}
    </button>
    {#if copyFailed}
      <span style="color:{T.negative};font-size:11px;flex-shrink:0;" title="Clipboard blocked by browser">!</span>
    {:else}
      <img src={copyIcon} alt="Copy" style="width:12px;height:12px;display:inline;flex-shrink:0;" />
    {/if}
    {#if explorer}
      <a
        href="https://gnosisscan.io/address/{address}"
        target="_blank"
        rel="noopener noreferrer"
        title="View on Gnosisscan"
        style="opacity:0.6;flex-shrink:0;"
        aria-label="View on Gnosisscan"
      >
        ↗
      </a>
    {/if}
  </span>
{:else}
  <button
    onclick={handleCopy}
    title={copyFailed ? 'Copy failed — select and copy manually' : 'Copy address'}
    style="display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:8px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:13px;cursor:pointer;"
  >
    {shortenAddress(address)}
    {#if copyFailed}
      <span style="color:{T.negative};font-size:11px;">!</span>
    {:else}
      <img src={copyIcon} alt="Copy" style="width:16px;height:16px;display:inline;" />
    {/if}
  </button>
{/if}
