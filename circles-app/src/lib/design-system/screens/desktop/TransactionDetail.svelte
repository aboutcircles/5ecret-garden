<script lang="ts">
  import { T } from '../../tokens.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Card from '../../Card.svelte';
  import Money from '../../Money.svelte';

  const transfers = [
    ['Gnosis (group)',      'group', 5044.11, 'shorn',         'punk'],
    ['Teenage Engineering', 'shop',  5044.11, 'Gnosis',        'group'],
    ['Teenage Engineering', 'shop',  355.88,  '0x4Dc7…664509', 'addr'],
    ['0x4Dc7…664509',       'addr',  355.88,  'shorn',         'punk'],
  ];

  const meta = [
    ['Hash',      '0x3ef6…705216', true],
    ['Block',     '38,402,118',    true],
    ['Network',   'Gnosis Chain',  false],
    ['Direction', 'Received',      false],
    ['Burns',     '< 0.01 CRC',   true],
    ['Events',    '22',            false],
  ];
</script>

<Card padding={0} style="overflow:hidden;">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid {T.hairlineSoft};">
    <div style="display:flex;align-items:center;gap:10px;">
      <button style="width:32px;height:32px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
        <Icon name="arrowLeft" size={14} />
      </button>
      <div style="display:flex;flex-direction:column;gap:1px;">
        <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.02em;">Transaction</span>
        <span style="font-size:12px;color:{T.inkMuted};">05 May 2026 · 14:49:55</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <Pill color="sage">Confirmed</Pill>
      <Button variant="secondary" size="sm" icon="copy">Copy hash</Button>
      <Button variant="secondary" size="sm" iconRight="external">Open in explorer</Button>
    </div>
  </div>

  <div style="padding:28px 32px;background:{T.sageSoft};">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:11.5px;font-weight:600;color:#1F5E37;letter-spacing:0.06em;text-transform:uppercase;">You received</span>
        <div style="font-family:{T.fontDisplay};font-size:56px;line-height:1;color:#0D3D1F;letter-spacing:-0.025em;">
          +5,399.99 <span style="font-family:{T.fontSans};font-size:16px;font-weight:500;color:#1F5E37;">CRC</span>
        </div>
        <span style="font-size:13px;color:#1F5E37;margin-top:4px;">From <b>Teenage Engineering PO-14</b> shop · paid by <b>shorn</b></span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
        <Avatar seed="shorn" size={56} />
        <span style="font-size:12px;color:#1F5E37;font-family:{T.fontMono};">0xc175…FdEe91</span>
      </div>
    </div>
  </div>

  <div style="padding:24px 32px;">
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div>
        <div style="font-size:12px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;margin-bottom:14px;">Aggregated transfers (4)</div>
        <div style="border:1px solid {T.hairlineSoft};border-radius:{T.radius.md}px;overflow:hidden;">
          {#each transfers as [from, fromKind, amount, to], i}
            <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:{i < 3 ? `1px solid ${T.hairlineSoft}` : 'none'};background:{i%2 ? T.surfaceAlt : 'transparent'};">
              <Avatar seed={from as string} size={28} kind={fromKind === 'group' ? 'group' : 'gradient'} />
              <span style="flex:1;font-size:13px;color:{T.ink};font-weight:540;">{from}</span>
              <Money value={amount as number} size={13} />
              <Icon name="arrowRight" size={14} stroke={T.inkSubtle} />
              <span style="width:140px;font-size:13px;color:{T.ink};font-weight:540;text-align:right;">{to}</span>
              <Avatar seed={to as string} size={28} />
            </div>
          {/each}
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:20px;">
        {#each meta as [k, v, mono]}
          <div style="display:flex;flex-direction:column;gap:2px;min-width:130px;">
            <span style="font-size:11px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">{k}</span>
            <span style="font-size:13px;color:{T.ink};font-family:{mono ? T.fontMono : T.fontSans};font-weight:540;">{v}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</Card>
