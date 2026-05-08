<script lang="ts">
  import { T } from '../../tokens.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import MobileShell from '../../MobileShell.svelte';
  import MobileHeader from '../../MobileHeader.svelte';

  const px = 18;
</script>

<MobileShell hideTabs scroll={false}>
  {#snippet header()}
    <MobileHeader title="Send Circles">
      {#snippet leading()}
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:{T.shadow.xs};">
          <Icon name="close" size={16} stroke={T.inkBody} />
        </button>
      {/snippet}
      {#snippet trailing()}
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:{T.shadow.xs};">
          <Icon name="info" size={16} stroke={T.inkBody} />
        </button>
      {/snippet}
    </MobileHeader>
  {/snippet}

  <div style="padding:12px {px}px 0;height:100%;display:flex;flex-direction:column;">
    <!-- Recipient card -->
    <div style="padding:14px 16px;border-radius:18px;background:{T.surface};border:1px solid {T.hairlineSoft};">
      <div style="display:flex;align-items:center;gap:12px;">
        <Avatar seed="paul" size={42} />
        <div style="display:flex;flex-direction:column;gap:1px;flex:1;">
          <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">To</span>
          <span style="font-size:15px;font-weight:580;color:{T.ink};">paul</span>
          <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">0xA82F…7B14</span>
        </div>
        <Pill color="sage">Mutual</Pill>
      </div>
    </div>

    <!-- Amount -->
    <div style="margin-top:18px;text-align:center;padding:24px 0;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Amount</span>
      <div style="margin-top:14px;">
        <span style="font-family:{T.fontDisplay};font-size:84px;line-height:1;color:{T.ink};letter-spacing:-0.03em;">42.<span style="color:{T.inkSubtle};">00</span></span>
      </div>
      <span style="font-size:14px;color:{T.inkMuted};font-family:{T.fontMono};margin-top:4px;display:block;">CRC · ≈ €38.22</span>
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;">
        {#each ['10', '50', '½', 'Max'] as v}
          <button style="padding:6px 14px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};font-family:{T.fontSans};font-size:12.5px;font-weight:580;color:{T.inkBody};cursor:pointer;">{v}</button>
        {/each}
      </div>
    </div>

    <!-- Trust path mini -->
    <div style="margin-top:auto;padding:14px 16px;border-radius:16px;background:{T.primaryFaint};border:1px solid {T.primarySoft};">
      <div style="display:flex;align-items:center;gap:10px;">
        <Icon name="sparkle" size={16} stroke={T.primary} strokeWidth={2} />
        <div style="display:flex;flex-direction:column;gap:1px;flex:1;">
          <span style="font-size:12.5px;font-weight:580;color:{T.primaryDeep};">Auto-routed via lina · kasper</span>
          <span style="font-size:11.5px;color:{T.inkBody};">2 hops · ~3s · gas ≈ €0.003</span>
        </div>
        <Icon name="chevronRight" size={16} stroke={T.primary} />
      </div>
    </div>

    <!-- Note input -->
    <div style="margin-top:12px;padding:10px 14px;border-radius:14px;background:{T.surface};border:1px solid {T.hairlineSoft};display:flex;align-items:center;gap:10px;">
      <Icon name="link" size={15} stroke={T.inkSubtle} />
      <span style="font-size:13px;color:{T.inkSubtle};flex:1;">Add a note (optional)</span>
    </div>

    <!-- CTA -->
    <div style="margin-top:14px;padding-bottom:22px;">
      <Button variant="primary" size="lg" full iconRight="arrowRight" style="height:56px;font-size:16px;">Review &amp; send</Button>
    </div>
  </div>
</MobileShell>
