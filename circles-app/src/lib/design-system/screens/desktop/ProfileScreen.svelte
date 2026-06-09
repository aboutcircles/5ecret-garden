<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Card from '../../Card.svelte';
  import FakeQR from '../../FakeQR.svelte';

  const me = CirclesData.me;

  const vouches = [
    ['lina',   '"Met shorn at the repair café — fixed my mother\'s sewing machine."', '12 days ago'],
    ['kasper', '"Lent us his cargo bike for the move, twice. Solid human."',          '1 month ago'],
    ['mia',    '"Cooks the best lentil soup in Kreuzberg. Trustworthy."',              '2 months ago'],
  ];

  const stats = [
    ['Trust score',   '92',  '/ 100'],
    ['Members since', '2y 4m', null],
    ['Vouched by',    '134', 'mutuals'],
    ['Group memb.',   '12',  'groups'],
  ];
</script>

<div style="display:grid;grid-template-columns:1fr 380px;gap:24px;align-items:flex-start;">
  <div style="display:flex;flex-direction:column;gap:20px;">
    <!-- Profile card -->
    <Card padding={0} style="overflow:hidden;">
      <div style="height:140px;background:linear-gradient(115deg,{T.coralSoft} 0%,{T.lilacSoft} 100%);"></div>
      <div style="padding:0 28px 24px;margin-top:-40px;position:relative;">
        <Avatar seed="shorn" size={88} style="border:4px solid {T.surface};" />
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;font-weight:400;">{me.name}</span>
            <Icon name="verified" size={18} stroke={T.primary} fill={T.primarySoft} />
          </div>
          <span style="font-family:{T.fontMono};font-size:12.5px;color:{T.inkMuted};">@{me.handle} · {me.address}</span>
          <p style="margin:8px 0 0;font-size:14px;color:{T.inkBody};line-height:1.5;max-width:540px;">
            Building tools for credit-as-care in Berlin. Trust me if you've shared a meal, a repo, or a bike with me. — Mutual only.
          </p>
          <div style="display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;">
            {#each ['mutual aid','p2p','mending','kreuzberg'] as t}
              <span style="font-size:11.5px;font-weight:580;padding:4px 10px;border-radius:9999px;background:{T.surfaceAlt};color:{T.inkBody};border:1px solid {T.hairlineSoft};">#{t}</span>
            {/each}
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid {T.hairlineSoft};">
        {#each stats as [k,v,sub], i}
          <div style="display:flex;flex-direction:column;gap:2px;padding:16px 22px;border-right:{i<3?`1px solid ${T.hairlineSoft}`:'none'};">
            <span style="font-size:11px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">{k}</span>
            <div style="display:flex;align-items:baseline;gap:5px;">
              <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.015em;">{v}</span>
              {#if sub}<span style="font-size:11.5px;color:{T.inkMuted};">{sub}</span>{/if}
            </div>
          </div>
        {/each}
      </div>
    </Card>

    <!-- Recent vouches -->
    <Card padding={24}>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:14px;font-weight:600;color:{T.ink};letter-spacing:-0.005em;">Recent vouches</span>
        <button style="background:transparent;border:0;cursor:pointer;font-family:{T.fontSans};font-size:12.5px;font-weight:580;color:{T.primary};">See all 134 →</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;margin-top:14px;">
        {#each vouches as [who,q,when], i}
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:{i<vouches.length-1?`1px solid ${T.hairlineSoft}`:'none'};">
            <Avatar seed={who} size={32} />
            <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:13px;font-weight:580;color:{T.ink};">{who}</span>
                <span style="font-size:12px;color:{T.inkMuted};">{when}</span>
              </div>
              <span style="font-size:13px;color:{T.inkBody};font-style:italic;line-height:1.45;">{q}</span>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  </div>

  <!-- Right rail -->
  <div style="display:flex;flex-direction:column;gap:16px;">
    <Card padding={24}>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <span style="font-size:13px;font-weight:600;color:{T.ink};">Share your circle</span>
        <div style="padding:18px;border-radius:{T.radius.md}px;background:{T.ink};color:{T.butter};display:flex;flex-direction:column;align-items:center;gap:14px;">
          <FakeQR size={156} />
          <div style="display:flex;flex-direction:column;gap:2px;align-items:center;">
            <span style="font-family:{T.fontDisplay};font-size:22px;">shorn.circles.eth</span>
            <span style="font-size:11px;opacity:0.7;font-family:{T.fontMono};letter-spacing:0.04em;">scan to add a trust connection</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <Button variant="secondary" size="sm" icon="copy">Copy link</Button>
          <Button variant="secondary" size="sm" icon="share">Share</Button>
          <Button variant="ghost" size="sm" icon="download">Save QR</Button>
        </div>
      </div>
    </Card>

    <Card padding={24}>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <span style="font-size:13px;font-weight:600;color:{T.ink};">Identity sources</span>
        {#each [['ENS','shorn.circles.eth','sage'],['Gnosis Safe','0xc175…FdEe91','lilac'],['POAP','14 events attended','butter'],['Email','verified','sage']] as [k,v,c]}
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <Pill color={c}>{k}</Pill>
            <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkBody};">{v}</span>
          </div>
        {/each}
      </div>
    </Card>
  </div>
</div>
