<script lang="ts">
  import { T } from '../../tokens.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import AvatarStack from '../../AvatarStack.svelte';
  import Button from '../../Button.svelte';

  interface Props { desktop?: boolean; }
  let { desktop }: Props = $props();
</script>

<div style="display:flex;flex-direction:column;gap:{desktop ? 18 : 14}px;">
  {#if !desktop}
    <div style="display:flex;flex-direction:column;gap:2px;align-items:center;margin-top:4px;">
      <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;">Trust someone</span>
      <span style="font-size:12.5px;color:{T.inkMuted};">Lets them pay you. Doesn't move money.</span>
    </div>
  {/if}

  <!-- Address input -->
  <div style="padding:14px 16px;border-radius:16px;background:{T.surfaceAlt};border:1px solid {T.primarySoft};box-shadow:{T.shadow.ring};">
    <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Recipient</span>
    <div style="margin-top:6px;font-family:{T.fontMono};font-size:13px;color:{T.ink};word-break:break-all;">mia.circles.eth</div>
    <div style="margin-top:4px;font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">0x4Fc2…91b3</div>
  </div>

  <!-- Profile preview -->
  <div style="padding:18px;border-radius:18px;background:linear-gradient(135deg,{T.lilacSoft} 0%,{T.coralSoft} 100%);">
    <div style="display:flex;align-items:center;gap:14px;">
      <Avatar seed="mia" size={56} ring={T.surface} />
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.02em;">mia</span>
          <Icon name="verified" size={14} stroke={T.primary} fill="#fff" />
        </div>
        <span style="font-size:12px;color:{T.inkBody};">Joined 8 months ago · 84 vouches</span>
      </div>
    </div>
    <div style="margin-top:14px;padding:12px 14px;background:rgba(255,255,255,0.55);border-radius:12px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <Icon name="contacts" size={13} stroke={T.primaryDeep} />
        <span style="font-size:11.5px;font-weight:580;color:{T.primaryDeep};letter-spacing:0.04em;text-transform:uppercase;">3 mutuals</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <AvatarStack seeds={['lina','kasper','paul']} size={22} />
        <span style="font-size:12px;color:{T.inkBody};"><b>lina</b>, <b>kasper</b>, and <b>paul</b> already trust mia</span>
      </div>
    </div>
  </div>

  <!-- What happens -->
  <div style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:{T.pageDeep};">
    <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">What happens</span>
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <Icon name="shield" size={14} stroke={T.primary} style="flex-shrink:0;margin-top:2px;" />
      <span style="font-size:12.5px;color:{T.inkBody};line-height:1.5;">mia can pay you with their CRC, routing through your network</span>
    </div>
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <Icon name="sparkle" size={14} stroke={T.primary} style="flex-shrink:0;margin-top:2px;" />
      <span style="font-size:12.5px;color:{T.inkBody};line-height:1.5;">If mia trusts you back, you're <b>mutual</b> and the path is bidirectional</span>
    </div>
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <Icon name="info" size={14} stroke={T.primary} style="flex-shrink:0;margin-top:2px;" />
      <span style="font-size:12.5px;color:{T.inkBody};line-height:1.5;">It does <b>not</b> move money. Trust is a permission, not a transfer</span>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 4px 0;">
    <span style="font-size:12px;color:{T.inkMuted};">Gas (sponsored by Circles)</span>
    <span style="font-size:12px;color:{T.inkBody};font-weight:540;">≈ €0.003</span>
  </div>

  <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
    <Button variant="ghost" full>Cancel</Button>
    <Button variant="primary" full icon="trust">Trust mia</Button>
  </div>
</div>
