<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import MobileShell from '../../MobileShell.svelte';
  import MobileHeader from '../../MobileHeader.svelte';
  import FakeQR from '../../FakeQR.svelte';

  const me = CirclesData.me;
  const px = 18;
</script>

<MobileShell active="wallet">
  {#snippet header()}
    <MobileHeader title="Profile">
      {#snippet leading()}
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:{T.shadow.xs};">
          <Icon name="arrowLeft" size={16} stroke={T.inkBody} />
        </button>
      {/snippet}
      {#snippet trailing()}
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:{T.shadow.xs};">
          <Icon name="more" size={16} stroke={T.inkBody} />
        </button>
      {/snippet}
    </MobileHeader>
  {/snippet}

  <div style="padding:8px {px}px 0;">
    <!-- Banner + avatar -->
    <div style="height:100px;border-radius:24px;margin-bottom:-34px;background:linear-gradient(115deg,{T.coralSoft} 0%,{T.lilacSoft} 100%);"></div>
    <div style="padding-left:6px;position:relative;">
      <Avatar seed="shorn" size={72} style="border:4px solid {T.page};" />
      <div style="display:flex;flex-direction:column;gap:3px;margin-top:10px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-family:{T.fontDisplay};font-size:28px;color:{T.ink};letter-spacing:-0.02em;">{me.name}</span>
          <Icon name="verified" size={18} stroke={T.primary} fill={T.primarySoft} />
        </div>
        <span style="font-family:{T.fontMono};font-size:11.5px;color:{T.inkMuted};">@{me.handle} · {me.address}</span>
        <p style="margin:6px 0 0;font-size:13px;color:{T.inkBody};line-height:1.5;">
          Building tools for credit-as-care in Berlin. Trust me if you've shared a meal, a repo, or a bike with me.
        </p>
      </div>
    </div>

    <!-- QR card -->
    <div style="margin-top:18px;padding:20px;border-radius:24px;background:{T.ink};color:{T.butter};display:flex;flex-direction:column;align-items:center;gap:12px;">
      <FakeQR size={150} />
      <div style="display:flex;flex-direction:column;gap:1px;align-items:center;">
        <span style="font-family:{T.fontDisplay};font-size:22px;">shorn.circles.eth</span>
        <span style="font-size:10.5px;opacity:0.7;font-family:{T.fontMono};letter-spacing:0.04em;text-transform:uppercase;">scan to add a trust connection</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
        <Button variant="secondary" size="sm" icon="copy" style="background:rgba(255,255,255,0.08);color:{T.butter};border:1px solid rgba(255,255,255,0.12);">Copy</Button>
        <Button variant="secondary" size="sm" icon="share" style="background:rgba(255,255,255,0.08);color:{T.butter};border:1px solid rgba(255,255,255,0.12);">Share</Button>
        <Button variant="secondary" size="sm" icon="download" style="background:rgba(255,255,255,0.08);color:{T.butter};border:1px solid rgba(255,255,255,0.12);">Save</Button>
      </div>
    </div>

    <!-- Stats grid -->
    <div style="margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      {#each [['Trust score','92','/100'],['Vouched by','134',null],['Groups','12',null]] as [k,v,sub]}
        <div style="padding:14px 12px;border-radius:16px;background:{T.surface};border:1px solid {T.hairlineSoft};">
          <span style="font-size:10.5px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">{k}</span>
          <div style="display:flex;align-items:baseline;gap:4px;margin-top:4px;">
            <span style="font-family:{T.fontDisplay};font-size:28px;color:{T.ink};letter-spacing:-0.015em;line-height:1;">{v}</span>
            {#if sub}<span style="font-size:11px;color:{T.inkMuted};">{sub}</span>{/if}
          </div>
        </div>
      {/each}
    </div>
    <div style="height:24px;"></div>
  </div>
</MobileShell>
