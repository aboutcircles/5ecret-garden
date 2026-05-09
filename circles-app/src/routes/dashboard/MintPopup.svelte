<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import { runTask } from '$lib/shared/utils/tasks';
  import { isBenignReceiptDecodeError } from '$lib/shared/utils/tx';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { avatarState } from '$lib/shared/state/avatar.svelte';

  interface Props {
    initialAmount: number;
    onMinted?: (newMintable: number) => void;
  }

  let { initialAmount, onMinted }: Props = $props();

  let mintableAmount = $state(initialAmount);
  let isMinting = $state(false);
  let lastMintedAt: Date | null = $state(null);

  async function refreshMintable() {
    if (!avatarState.avatar) return;
    const refreshed = await avatarState.avatar.getMintableAmount();
    mintableAmount = refreshed ?? 0;
    onMinted?.(mintableAmount);
  }

  async function handleMint() {
    if (!avatarState.avatar || mintableAmount < 0.01 || isMinting) return;
    isMinting = true;
    try {
      await runTask({
        name: `Minting ${roundToDecimals(mintableAmount)} CRC…`,
        promise: avatarState.avatar.personalMint(),
      });
      lastMintedAt = new Date();
    } catch (error) {
      if (!isBenignReceiptDecodeError(error)) throw error;
      lastMintedAt = new Date();
    } finally {
      await refreshMintable();
      isMinting = false;
      // Auto-close shortly after a successful mint
      if (mintableAmount < 0.01) {
        setTimeout(() => popupControls.back(), 1200);
      }
    }
  }

  const displayAmount = $derived(roundToDecimals(mintableAmount));
  const lastMintLabel = $derived(
    lastMintedAt
      ? `Minted at ${lastMintedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'CRC growing in real time',
  );
</script>

<div style="display:flex;flex-direction:column;gap:16px;">
  <!-- Hero -->
  <div style="
    position:relative;border-radius:26px;padding:36px 22px 28px;
    background:radial-gradient(140% 100% at 50% 100%,{T.coral} 0%,{T.lilac} 50%,{T.primaryDeep} 100%);
    color:#fff;text-align:center;overflow:hidden;
  ">
    <!-- Sun rays -->
    <svg
      style="position:absolute;top:-120px;left:50%;transform:translateX(-50%);opacity:0.18;"
      width="600" height="600" viewBox="-100 -100 200 200" aria-hidden="true"
    >
      {#each Array.from({ length: 24 }) as _, i}
        <line x1="0" y1="0" x2="0" y2="100" transform="rotate({(i / 24) * 360})" stroke="#fff" stroke-width="1" />
      {/each}
      <circle r="40" fill="rgba(255,255,255,0.12)" />
    </svg>

    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;">
      <span style="
        display:inline-flex;align-items:center;
        padding:4px 12px;border-radius:9999px;
        background:rgba(0,0,0,0.25);color:#FBE3D8;
        font-family:{T.fontSans};font-size:11px;font-weight:580;letter-spacing:0.02em;
      ">{mintableAmount < 0.01 ? 'All caught up' : 'Available to mint'}</span>

      <span style="font-family:{T.fontDisplay};font-size:84px;line-height:1;color:#fff;letter-spacing:-0.03em;font-weight:400;margin-top:6px;">
        {displayAmount}
      </span>
      <span style="font-size:13px;color:rgba(255,255,255,0.85);font-family:{T.fontMono};">
        {lastMintLabel}
      </span>
    </div>
  </div>

  <!-- Info box -->
  <div style="
    display:flex;flex-direction:column;gap:10px;
    padding:14px;border-radius:14px;
    background:{T.butterSoft};border:1px solid rgba(244,210,122,0.4);
  ">
    <div style="display:flex;align-items:center;gap:10px;">
      <Icon name="info" size={14} stroke="#7B5215" />
      <span style="font-size:11px;font-weight:600;color:#7B5215;letter-spacing:0.04em;text-transform:uppercase;">How this works</span>
    </div>
    <span style="font-size:12.5px;color:{T.inkBody};line-height:1.55;">
      You accrue <b>1 CRC per hour</b>. Mint regularly — after 14 days without minting, accrual pauses and the missed time is forfeit.
    </span>
  </div>

  <!-- Mint button -->
  <button
    type="button"
    onclick={handleMint}
    disabled={mintableAmount < 0.01 || isMinting}
    data-popup-default-action
    data-popup-initial-focus
    style="
      width:100%;height:56px;border-radius:9999px;border:0;cursor:pointer;
      background:{mintableAmount < 0.01 ? T.pageDeep : T.primary};
      color:{mintableAmount < 0.01 ? T.inkMuted : '#fff'};
      display:inline-flex;align-items:center;justify-content:center;gap:8px;
      font-family:{T.fontSans};font-size:16px;font-weight:580;letter-spacing:-0.005em;
      box-shadow:{mintableAmount < 0.01
        ? 'none'
        : '0 8px 24px rgba(88,73,212,0.35),0 1px 0 rgba(255,255,255,0.18) inset'};
      opacity:{isMinting ? 0.7 : 1};
      transition:transform .08s,box-shadow .15s;
    "
  >
    {#if isMinting}
      <svg class="mp-spin" style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
      </svg>
      Minting…
    {:else if mintableAmount < 0.01}
      Nothing to mint yet
    {:else}
      <Icon name="sparkle" size={17} stroke="#fff" strokeWidth={2} />
      Mint {displayAmount} CRC
    {/if}
  </button>

  <span style="font-size:11px;color:{T.inkSubtle};text-align:center;margin-top:-6px;">
    Gas-free · settled in &lt; 1s
  </span>
</div>

<style>
  @keyframes mp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .mp-spin { animation: mp-spin 0.9s linear infinite; }
</style>
