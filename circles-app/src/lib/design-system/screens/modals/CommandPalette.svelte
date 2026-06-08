<script lang="ts">
  import { T } from '../../tokens.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Pill from '../../Pill.svelte';
  import CirclesLogo from '../../CirclesLogo.svelte';

  const sections = [
    { kind: 'People', items: [
      { name: 'paul',       sub: 'Mutual · 0xA82F…7B14',  hue: 18 },
      { name: 'lina_b',     sub: 'Mutual · 0x4Dc7…6645',  hue: 320 },
      { name: 'mia',        sub: 'Trust them?',            hue: 168, action: true },
    ]},
    { kind: 'Groups', items: [
      { name: 'mi familia',  sub: '14 members · joined',   glyph: 'FMLY' },
      { name: 'Berlin Coop', sub: '1.2k members · join?',  glyph: 'BLN', action: true },
    ]},
    { kind: 'Actions', items: [
      { name: 'Send Circles',  sub: 'Open send flow',                  icon: 'send' },
      { name: 'Receive · QR',  sub: 'Show your address',               icon: 'qr' },
      { name: 'Mint daily',    sub: '146.91 CRC ready',                icon: 'sparkle' },
      { name: 'Settings',      sub: 'Notifications, network, security', icon: 'shield' },
    ]},
  ];
</script>

<div style="
  width:620px;max-width:100%;
  background:{T.surface};border-radius:18px;
  box-shadow:0 24px 80px rgba(15,10,30,0.28),0 0 0 1px rgba(15,10,30,0.06);
  overflow:hidden;display:flex;flex-direction:column;max-height:520px;
">
  <!-- Search input -->
  <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid {T.hairlineSoft};">
    <Icon name="search" size={18} stroke={T.inkMuted} />
    <span style="flex:1;font-size:16px;color:{T.ink};font-family:{T.fontSans};font-weight:500;">
      mi<span style="display:inline-block;width:1.5px;height:18px;background:{T.primary};margin-left:1px;vertical-align:middle;"></span>
    </span>
    <div style="display:flex;align-items:center;gap:6px;">
      <Pill color="neutral" style="font-family:{T.fontMono};">esc</Pill>
    </div>
  </div>

  <!-- Results -->
  <div style="overflow:auto;padding:8px 0;">
    {#each sections as sec, si}
      <span style="display:block;padding:10px 18px 4px;font-size:10.5px;font-weight:600;color:{T.inkSubtle};letter-spacing:0.08em;text-transform:uppercase;">{sec.kind}</span>
      {#each sec.items as it, ii}
        {@const isFirst = si === 0 && ii === 0}
        <div style="
          display:flex;align-items:center;gap:12px;
          padding:8px 18px;cursor:pointer;
          background:{isFirst ? T.primaryFaint : 'transparent'};
          border-left:3px solid {isFirst ? T.primary : 'transparent'};
        ">
          {#if 'icon' in it && it.icon}
            <div style="width:36px;height:36px;border-radius:10px;background:{T.pageDeep};display:flex;align-items:center;justify-content:center;">
              <Icon name={it.icon} size={16} stroke={T.inkBody} />
            </div>
          {:else if 'glyph' in it && it.glyph}
            <div style="width:36px;height:36px;border-radius:10px;background:{T.lilacSoft};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:{T.primaryDeep};font-family:{T.fontMono};letter-spacing:0.04em;">{it.glyph}</div>
          {:else}
            <Avatar seed={it.name} size={36} />
          {/if}
          <div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;">
            <span style="font-size:13.5px;font-weight:540;color:{T.ink};">{it.name}</span>
            <span style="font-size:11.5px;color:{T.inkMuted};">{it.sub}</span>
          </div>
          {#if 'action' in it && it.action}<Pill color="lilac">Action</Pill>{/if}
          {#if isFirst}
            <Pill color="neutral" style="font-family:{T.fontMono};">↵</Pill>
          {/if}
        </div>
      {/each}
    {/each}
  </div>

  <!-- Footer -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-top:1px solid {T.hairlineSoft};background:{T.surfaceAlt};">
    <div style="display:flex;align-items:center;gap:10px;">
      {#each [['↑↓','navigate'],['↵','open'],['tab','filter kind']] as [k,v]}
        <div style="display:flex;align-items:center;gap:4px;">
          <Pill color="neutral" style="font-family:{T.fontMono};">{k}</Pill>
          <span style="font-size:11.5px;color:{T.inkMuted};">{v}</span>
        </div>
      {/each}
    </div>
    <div style="display:flex;align-items:center;gap:4px;">
      <span style="font-size:11.5px;color:{T.inkMuted};">Powered by</span>
      <CirclesLogo size={14} />
    </div>
  </div>
</div>
