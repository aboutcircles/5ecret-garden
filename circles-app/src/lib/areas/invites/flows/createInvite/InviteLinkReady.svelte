<script lang="ts">
  import { popupControls } from '$lib/shared/state/popup';
  import { buildReferralLink } from '../../constants';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  interface Props {
    privateKey: string;
  }
  let { privateKey }: Props = $props();

  const link = $derived(buildReferralLink(privateKey));
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  let copied = $state(false);
  let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
      if (copyResetTimer) clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => (copied = false), 2000);
    } catch (e) {
      console.warn('[invites] clipboard write failed', e);
    }
  }

  async function shareLink() {
    if (!canShare) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: 'Join me on Circles',
        text: 'I’d like to invite you to Circles. Use my link to join:',
        url: link,
      });
    } catch {
      // user dismissed the share sheet — not an error
    }
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
  <!-- Hero -->
  <div style="display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;padding-top:4px;">
    <div style="width:44px;height:44px;border-radius:9999px;background:{T.sageSoft};display:flex;align-items:center;justify-content:center;">
      <Icon name="check" size={22} stroke={T.positive} strokeWidth={2.2} />
    </div>
    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1.15;">
      Your invite link is ready
    </span>
    <span style="font-size:12.5px;color:{T.inkMuted};line-height:1.5;max-width:320px;">
      Share it with someone new. They can join Circles with this link — no wallet required.
    </span>
  </div>

  <!-- Link card -->
  <div style="
    background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
    padding:14px 16px;display:flex;flex-direction:column;gap:8px;
  ">
    <span style="font-size:10.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Invite link</span>
    <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkBody};word-break:break-all;line-height:1.5;">
      {link}
    </span>
  </div>

  <!-- Actions -->
  <div style="display:flex;gap:8px;margin-top:2px;">
    <button
      onclick={copyLink}
      style="
        flex:1;height:42px;border-radius:12px;cursor:pointer;
        background:{copied ? T.sageSoft : T.surface};border:1px solid {copied ? T.sage : T.hairline};
        display:inline-flex;align-items:center;justify-content:center;gap:7px;
        font-family:{T.fontSans};font-size:13px;font-weight:540;color:{copied ? T.positive : T.inkBody};
      "
    >
      <Icon name={copied ? 'check' : 'copy'} size={15} stroke={copied ? T.positive : T.inkBody} />
      {copied ? 'Copied' : 'Copy link'}
    </button>
    {#if canShare}
      <button
        onclick={shareLink}
        style="
          flex:1;height:42px;border-radius:12px;cursor:pointer;
          background:{T.primary};border:0;color:#fff;
          display:inline-flex;align-items:center;justify-content:center;gap:7px;
          font-family:{T.fontSans};font-size:13px;font-weight:540;
        "
      >
        <Icon name="share" size={15} stroke="#fff" />
        Share
      </button>
    {/if}
  </div>

  <button
    onclick={() => popupControls.close()}
    data-popup-default-action
    style="
      width:100%;height:44px;border-radius:12px;cursor:pointer;margin-top:2px;
      background:{T.surface};border:1px solid {T.hairline};
      font-family:{T.fontSans};font-size:14px;font-weight:540;color:{T.inkBody};
    "
  >Done</button>
</div>
