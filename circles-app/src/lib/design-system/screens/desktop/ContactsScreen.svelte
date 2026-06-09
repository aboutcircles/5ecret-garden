<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Card from '../../Card.svelte';
  import Tabs from '../../Tabs.svelte';
  import Money from '../../Money.svelte';

  const contacts = CirclesData.contacts;
  let tab = $state('people');

  const trustMap: Record<string, {label: string, color: any}> = {
    mutual:   { label: 'Mutual',    color: 'sage' },
    incoming: { label: 'Trusts you', color: 'lilac' },
    outgoing: { label: 'You trust',  color: 'butter' },
    pending:  { label: 'Pending',    color: 'subtle' },
  };

  // Network constellation
  const W = 760, H = 200, cx = 110, cy = H / 2;
  const ring1 = Array.from({length: 7}, (_, i) => ({ a: (i * Math.PI * 2) / 7 - Math.PI / 2, r: 60 }));
  const ring2 = Array.from({length: 14}, (_, i) => ({ a: (i * Math.PI * 2) / 14 + 0.1, r: 110 }));
  const ring1colors = ['#F4B6A1','#E0CCF2','#FCDB91','#B6D4BC','#F4B6A1','#E0CCF2','#FCDB91'];
</script>

<div style="display:flex;flex-direction:column;gap:20px;">
  <div style="display:flex;align-items:center;gap:10px;">
    <Tabs value={tab} onchange={(id) => tab = id} items={[
      {id:'people',label:'People',count:247},
      {id:'pending',label:'Pending',count:3},
      {id:'suggestions',label:'Suggestions'},
      {id:'blocked',label:'Blocked'}
    ]} />
    <div style="flex:1;"></div>
    <Button variant="secondary" size="sm" icon="filter">Filter</Button>
    <Button variant="primary" size="sm" icon="plus">Trust someone</Button>
  </div>

  <!-- Trust map summary -->
  <Card padding={0} style="overflow:hidden;">
    <div style="display:flex;align-items:stretch;">
      <div style="display:flex;flex-direction:column;gap:8px;padding:20px 24px;border-right:1px solid {T.hairlineSoft};width:320px;">
        <span style="font-size:11.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Your network</span>
        <div style="font-family:{T.fontDisplay};font-size:42px;line-height:1;color:{T.ink};letter-spacing:-0.02em;">247<span style="font-family:{T.fontSans};font-size:16px;color:{T.inkMuted};font-weight:500;margin-left:6px;">people</span></div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:6px;">
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:4px;background:{T.sage};display:inline-block;"></span><span style="font-size:12.5px;color:{T.inkBody};"><b>134</b> mutual</span></div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:4px;background:{T.primary};display:inline-block;"></span><span style="font-size:12.5px;color:{T.inkBody};"><b>76</b> trust you</span></div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:4px;background:{T.coral};display:inline-block;"></span><span style="font-size:12.5px;color:{T.inkBody};"><b>37</b> you trust</span></div>
        </div>
      </div>
      <div style="flex:1;padding:20px 24px;position:relative;">
        <!-- Network constellation SVG -->
        <svg width="100%" height={H} viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="halo" cx="50%" cy="50%">
              <stop offset="0%" stop-color={T.primary} stop-opacity="0.22" />
              <stop offset="100%" stop-color={T.primary} stop-opacity="0" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={120} fill="url(#halo)" />
          {#each ring2 as p, i}
            <line x1={cx} y1={cy} x2={cx + Math.cos(p.a) * p.r} y2={cy + Math.sin(p.a) * p.r} stroke={T.hairline} stroke-width="0.8" />
          {/each}
          {#each ring1 as p, i}
            <line x1={cx} y1={cy} x2={cx + Math.cos(p.a) * p.r} y2={cy + Math.sin(p.a) * p.r} stroke={T.primary} stroke-width="1.2" opacity="0.5" />
          {/each}
          {#each ring2 as p, i}
            <circle cx={cx + Math.cos(p.a) * p.r} cy={cy + Math.sin(p.a) * p.r} r="4.5" fill={T.surface} stroke={T.inkSubtle} stroke-width="1" />
          {/each}
          {#each ring1 as p, i}
            <circle cx={cx + Math.cos(p.a) * p.r} cy={cy + Math.sin(p.a) * p.r} r="6.5" fill={ring1colors[i]} stroke={T.surface} stroke-width="2" />
          {/each}
          <circle cx={cx} cy={cy} r="22" fill={T.ink} />
          <text x={cx} y={cy + 4} text-anchor="middle" font-family={T.fontDisplay} font-size="14" fill={T.butter}>you</text>
          <g transform="translate(380, 0)">
            <text x="0" y="22" font-family={T.fontSans} font-size="11" font-weight="600" fill={T.inkMuted} letter-spacing="1.2">2ND DEGREE · 1,084 PEOPLE</text>
            {#each Array.from({length: 80}) as _, i}
              {@const x = (i % 16) * 22 + 5}
              {@const y = Math.floor(i / 16) * 22 + 38}
              {@const c = ['#F4B6A1','#E0CCF2','#FCDB91','#B6D4BC','#F0D7C8'][i % 5]}
              <circle cx={x} cy={y} r="6" fill={c} opacity="0.85" />
            {/each}
          </g>
        </svg>
      </div>
    </div>
  </Card>

  <!-- Contact table -->
  <Card padding={0} style="overflow:hidden;">
    <div style="display:grid;grid-template-columns:1fr 140px 200px 120px 80px;gap:16px;padding:12px 24px;background:{T.pageDeep};border-bottom:1px solid {T.hairlineSoft};">
      {#each ['Name','Trust','Last interaction','Total flowed',''] as h}
        <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">{h}</span>
      {/each}
    </div>
    {#each contacts as c, i}
      {@const trust = trustMap[c.trust] || trustMap.pending}
      <div style="display:grid;grid-template-columns:1fr 140px 200px 120px 80px;gap:16px;padding:14px 24px;align-items:center;border-bottom:{i===contacts.length-1?'none':`1px solid ${T.hairlineSoft}`};">
        <div style="display:flex;align-items:center;gap:12px;">
          <Avatar seed={c.handle} size={36} />
          <div style="display:flex;flex-direction:column;gap:1px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:14px;font-weight:580;color:{T.ink};">{c.name}</span>
              {#if c.verified}<Icon name="verified" size={13} stroke={T.primary} fill={T.primarySoft} />{/if}
            </div>
            <span style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">@{c.handle} · {c.address}</span>
          </div>
        </div>
        <Pill color={trust.color}>{trust.label}</Pill>
        <div style="display:flex;flex-direction:column;gap:1px;">
          <span style="font-size:12.5px;color:{T.ink};">{c.lastInteraction}</span>
          <span style="font-size:11.5px;color:{T.inkMuted};">{c.lastNote}</span>
        </div>
        <Money value={c.flowed} size={13} weight={580} />
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;">
          <button style="width:28px;height:28px;border-radius:8px;background:{T.surface};border:1px solid {T.hairline};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><Icon name="send" size={13} stroke={T.inkBody} /></button>
          <button style="width:28px;height:28px;border-radius:8px;background:{T.surface};border:1px solid {T.hairline};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><Icon name="more" size={13} stroke={T.inkBody} /></button>
        </div>
      </div>
    {/each}
  </Card>
</div>
