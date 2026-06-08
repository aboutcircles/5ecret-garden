<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Button from '../../Button.svelte';
  import FakeQR from '../../FakeQR.svelte';

  const me = CirclesData.me;
  interface Props { desktop?: boolean; }
  let { desktop }: Props = $props();
</script>

<div style="display:flex;flex-direction:column;gap:{desktop ? 18 : 14}px;">
  {#if !desktop}
    <div style="display:flex;flex-direction:column;gap:2px;align-items:center;margin-top:4px;">
      <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;">Receive</span>
      <span style="font-size:12.5px;color:{T.inkMuted};">Anyone with trust to you can pay</span>
    </div>
  {/if}

  <div style="background:{T.ink};color:{T.butter};border-radius:22px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:14px;">
    <FakeQR size={170} />
    <div style="display:flex;flex-direction:column;gap:2px;align-items:center;">
      <span style="font-family:{T.fontDisplay};font-size:22px;">shorn.circles.eth</span>
      <span style="font-family:{T.fontMono};font-size:11px;opacity:0.7;">{me.address}</span>
    </div>
  </div>

  <!-- Request amount -->
  <div style="padding:14px 16px;border-radius:14px;background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};display:flex;align-items:center;gap:12px;">
    <Icon name="sparkle" size={16} stroke={T.primary} />
    <div style="display:flex;flex-direction:column;gap:0;flex:1;">
      <span style="font-size:12.5px;font-weight:580;color:{T.ink};">Request a specific amount</span>
      <span style="font-size:11.5px;color:{T.inkMuted};">Generates a one-time link with the amount baked in</span>
    </div>
    <Icon name="chevronRight" size={14} stroke={T.inkMuted} />
  </div>

  <div style="display:flex;align-items:center;gap:8px;">
    <Button variant="secondary" full icon="copy">Copy address</Button>
    <Button variant="primary" full icon="share">Share</Button>
  </div>

  <div style="display:flex;align-items:flex-start;gap:8px;padding:4px 4px 0;">
    <Icon name="info" size={13} stroke={T.inkMuted} style="flex-shrink:0;margin-top:2px;" />
    <span style="font-size:11.5px;color:{T.inkMuted};line-height:1.5;">Receiving CRC requires a trust path. People without trust can still scan to <b>start one</b>.</span>
  </div>
</div>
