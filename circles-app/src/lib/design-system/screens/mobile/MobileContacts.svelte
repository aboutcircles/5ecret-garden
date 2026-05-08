<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import MobileShell from '../../MobileShell.svelte';
  import MobileHeader from '../../MobileHeader.svelte';

  const contacts = CirclesData.contacts;
  const px = 18;

  const chips = [
    { label: 'Mutual',    count: 134, color: T.sage,    bg: T.sageSoft },
    { label: 'Trust you', count: 76,  color: T.primary, bg: T.primarySoft },
    { label: 'You trust', count: 37,  color: T.coral,   bg: T.coralSoft },
    { label: 'Pending',   count: 3,   color: T.inkMuted,bg: T.pageDeep },
  ];

  const trustPill: Record<string, {label:string,color:any}> = {
    mutual:   { label: 'Mutual',    color: 'sage' },
    incoming: { label: 'Trusts you', color: 'lilac' },
    outgoing: { label: 'You trust',  color: 'butter' },
    pending:  { label: 'Pending',    color: 'subtle' },
  };
</script>

<MobileShell active="contacts">
  {#snippet header()}
    <MobileHeader>
      {#snippet leading()}
        <div style="display:flex;flex-direction:column;gap:0;">
          <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;line-height:1;">People</span>
          <span style="font-size:11.5px;color:{T.inkMuted};">247 in your network</span>
        </div>
      {/snippet}
      {#snippet trailing()}
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.primary};border:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
          <Icon name="plus" size={16} stroke="#fff" strokeWidth={2.2} />
        </button>
      {/snippet}
    </MobileHeader>
  {/snippet}

  <div style="padding:4px {px}px 0;">
    <!-- Search -->
    <div style="height:42px;padding:0 14px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:flex;align-items:center;gap:10px;margin-top:6px;">
      <Icon name="search" size={16} stroke={T.inkMuted} />
      <span style="font-size:13.5px;color:{T.inkSubtle};flex:1;">Search people, addresses, ENS…</span>
    </div>

    <!-- Trust chips -->
    <div style="display:flex;align-items:center;gap:8px;margin-top:14px;overflow-x:auto;padding-bottom:4px;">
      {#each chips as c}
        <div style="flex:0 0 auto;padding:10px 14px;border-radius:14px;background:{c.bg};min-width:110px;">
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:3px;background:{c.color};display:inline-block;"></span><span style="font-size:11px;font-weight:580;color:{T.inkBody};">{c.label}</span></div>
          <div style="font-family:{T.fontDisplay};font-size:24px;color:{T.ink};margin-top:2px;line-height:1;letter-spacing:-0.015em;">{c.count}</div>
        </div>
      {/each}
    </div>

    <!-- Pending request -->
    <div style="margin-top:14px;padding:12px 14px;border-radius:16px;background:{T.surface};border:1px solid {T.hairlineSoft};display:flex;align-items:center;gap:12px;">
      <Avatar seed="kasper" size={36} />
      <div style="display:flex;flex-direction:column;gap:1px;flex:1;">
        <span style="font-size:13.5px;font-weight:540;color:{T.ink};">kasper trusted you</span>
        <span style="font-size:11.5px;color:{T.inkMuted};">3 mutuals · trust back?</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button style="width:32px;height:32px;border-radius:9999px;background:{T.sageSoft};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><Icon name="check" size={15} stroke={T.positive} strokeWidth={2.2} /></button>
        <button style="width:32px;height:32px;border-radius:9999px;background:{T.pageDeep};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><Icon name="close" size={15} stroke={T.inkBody} strokeWidth={2.2} /></button>
      </div>
    </div>

    <!-- People list -->
    <span style="display:block;font-size:11.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin-top:18px;margin-bottom:8px;padding-left:4px;">All people</span>
    <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};overflow:hidden;">
      {#each contacts as c, i}
        {@const tp = trustPill[c.trust] || trustPill.pending}
        <div style="display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center;padding:12px 14px;border-bottom:{i<contacts.length-1?`1px solid ${T.hairlineSoft}`:'none'};">
          <Avatar seed={c.handle} size={40} />
          <div style="display:flex;flex-direction:column;gap:1px;">
            <div style="display:flex;align-items:center;gap:5px;">
              <span style="font-size:14px;font-weight:580;color:{T.ink};">{c.name}</span>
              {#if c.verified}<Icon name="verified" size={12} stroke={T.primary} fill={T.primarySoft} />{/if}
            </div>
            <span style="font-size:11.5px;color:{T.inkMuted};">{c.lastInteraction} · {c.lastNote.split(' · ')[0]}</span>
          </div>
          <Pill color={tp.color}>{tp.label}</Pill>
        </div>
      {/each}
    </div>
    <div style="height:16px;"></div>
  </div>
</MobileShell>
