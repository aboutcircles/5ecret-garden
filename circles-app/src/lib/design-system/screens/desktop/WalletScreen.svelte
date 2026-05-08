<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Card from '../../Card.svelte';
  import Money from '../../Money.svelte';

  const me = CirclesData.me;

  // Sparkline data
  const points = [22, 24, 24, 23, 24, 24, 24];
  const w = 220, h = 70, pad = 8, max = 28, min = 18;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1));
  const ys = points.map((v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2));
  const sparkD = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const sparkArea = sparkD + ` L${xs[xs.length - 1]},${h - pad} L${xs[0]},${h - pad} Z`;

  const breakdown = [
    { label: 'Personal CRC', value: '24.18', sub: 'minted by you',  tint: T.butter },
    { label: 'From trust',   value: '64.10', sub: '170 issuers',    tint: T.coral },
    { label: 'Group currency',value:'12.06', sub: '39 groups',      tint: T.primary },
    { label: 'Mintable now', value: '146.91',sub: 'last claim 6d ago', tint: T.sage, action: true },
  ];

  // Activity grouping
  const activity = CirclesData.activity;
  const byDate: Record<string, typeof activity> = {};
  activity.forEach((it) => { (byDate[it.date] ??= []).push(it); });
</script>

<div style="display: flex; flex-direction: column; gap: 24px;">
  <!-- Balance Hero -->
  <Card padding={0} style="overflow: hidden;">
    <div style="
      padding: 28px 32px 24px;
      background: radial-gradient(120% 140% at 100% 0%, {T.lilacSoft} 0%, {T.surface} 60%);
    ">
      <div style="display: flex; align-items: flex-start; justify-content: space-between;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; font-weight: 600; color: {T.inkMuted}; letter-spacing: 0.06em; text-transform: uppercase;">Total balance</span>
            <Pill color="sage">+ 24.00 today</Pill>
          </div>
          <div style="font-family: {T.fontDisplay}; font-size: 64px; line-height: 1; color: {T.ink}; letter-spacing: -0.025em; margin-top: 6px; font-weight: 400;">
            {me.balance.toFixed(2)}<span style="margin-left: 12px; font-family: {T.fontSans}; font-size: 18px; font-weight: 500; color: {T.inkMuted};">CRC</span>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;"><span style="width:6px;height:6px;border-radius:3px;background:{T.coral};display:inline-block;"></span><span style="font-size:13px;color:{T.inkBody};"><b style="color:{T.ink};">{me.fromPeople}</b> people</span></div>
            <span style="color:{T.inkFaint};">·</span>
            <div style="display: flex; align-items: center; gap: 6px;"><span style="width:6px;height:6px;border-radius:3px;background:{T.primary};display:inline-block;"></span><span style="font-size:13px;color:{T.inkBody};"><b style="color:{T.ink};">{me.fromGroups}</b> groups</span></div>
            <span style="color:{T.inkFaint};">·</span>
            <div style="display: flex; align-items: center; gap: 6px;"><span style="width:6px;height:6px;border-radius:3px;background:{T.sage};display:inline-block;"></span><span style="font-size:13px;color:{T.inkBody};">Trust depth <b style="color:{T.ink};">4</b></span></div>
          </div>
        </div>

        <!-- Sparkline -->
        <div style="text-align: right;">
          <div style="font-size: 11.5px; color: {T.inkMuted}; font-weight: 580; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 4px;">7-day mint</div>
          <svg width={w} height={h}>
            <defs>
              <linearGradient id="spkA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color={T.primary} stop-opacity="0.25" />
                <stop offset="100%" stop-color={T.primary} stop-opacity="0" />
              </linearGradient>
            </defs>
            <path d={sparkArea} fill="url(#spkA)" />
            <path d={sparkD} stroke={T.primary} stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            {#each xs as x, i}
              <circle cx={x} cy={ys[i]} r={i === xs.length - 1 ? 3 : 1.5} fill={T.primary} />
            {/each}
          </svg>
          <div style="font-size: 11px; color: {T.inkSubtle}; font-family: {T.fontMono}; margin-top: -4px;">168.00 CRC · last 7 days</div>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 10px; margin-top: 22px;">
        <Button variant="primary" size="md" icon="send">Send</Button>
        <Button variant="secondary" size="md" icon="receive">Receive</Button>
        <Button variant="secondary" size="md" icon="trust">Trust someone</Button>
        <Button variant="ghost" size="md" icon="qr">Scan</Button>
        <div style="flex: 1;"></div>
        <Button variant="ghost" size="md" icon="download">Export</Button>
      </div>
    </div>

    <!-- Breakdown bar -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid {T.hairlineSoft};">
      {#each breakdown as s, i}
        <div style="padding: 18px 24px; border-right: {i < 3 ? `1px solid ${T.hairlineSoft}` : 'none'}; position: relative;">
          <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 6px;">
            <span style="width:8px;height:8px;border-radius:2px;background:{s.tint};display:inline-block;"></span>
            <span style="font-size: 11.5px; font-weight: 580; color: {T.inkMuted}; letter-spacing: 0.04em; text-transform: uppercase;">{s.label}</span>
          </div>
          <div style="font-family: {T.fontSans}; font-size: 22px; font-weight: 580; color: {T.ink}; font-variant-numeric: tabular-nums; letter-spacing: -0.015em;">{s.value} <span style="font-size:12px;color:{T.inkMuted};font-weight:500;">CRC</span></div>
          <div style="font-size: 12px; color: {T.inkMuted}; margin-top: 2px;">{s.sub}</div>
          {#if s.action}
            <button style="position:absolute;top:18px;right:16px;font-size:11.5px;font-weight:600;color:{T.primary};background:transparent;border:0;cursor:pointer;">Mint →</button>
          {/if}
        </div>
      {/each}
    </div>
  </Card>

  <!-- Activity List -->
  <div style="display: flex; flex-direction: column; gap: 24px;">
    {#each Object.entries(byDate) as [date, rows]}
      <div>
        <div style="font-size:11.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;padding:0 4px 8px;">{date}</div>
        <Card padding={0} style="overflow:hidden;">
          {#each rows as row, i}
            {@const isPositive = row.amount >= 0}
            {@const isMint = row.kind === 'mint'}
            <div style="
              display: grid; grid-template-columns: 36px 1fr auto auto; gap: 14px;
              align-items: center; padding: 14px 20px;
              border-bottom: {i === rows.length - 1 ? 'none' : `1px solid ${T.hairlineSoft}`};
              cursor: pointer;
            ">
              <div style="position: relative;">
                {#if isMint}
                  <div style="width:36px;height:36px;border-radius:50%;background:{T.butterSoft};display:flex;align-items:center;justify-content:center;">
                    <Icon name="sparkle" size={16} stroke="#B07014" strokeWidth={2} />
                  </div>
                {:else if row.avatar === 'token'}
                  <Avatar seed={row.who} size={36} kind="token" />
                {:else if row.avatar === 'group'}
                  <Avatar seed={row.who} size={36} icon="groups" />
                {:else}
                  <Avatar seed={row.who} size={36} />
                {/if}
                <span style="
                  position:absolute;right:-2px;bottom:-2px;
                  width:16px;height:16px;border-radius:50%;
                  background:{isMint ? T.butter : isPositive ? T.sage : T.coral};
                  color:#fff;display:flex;align-items:center;justify-content:center;
                  border:2px solid {T.surface};
                ">
                  <Icon name={isMint ? 'plus' : isPositive ? 'receive' : 'send'} size={9} strokeWidth={2.6} stroke="#fff" />
                </span>
              </div>
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:540;color:{T.ink};margin-bottom:1px;">{row.who}</div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:12px;color:{T.inkMuted};">{row.when}</span>
                  {#if row.note}
                    <span style="color:{T.inkFaint};">·</span>
                    <span style="font-size:12px;color:{T.inkMuted};font-style:italic;">"{row.note}"</span>
                  {/if}
                  {#if row.system}
                    <Pill color="butter">System</Pill>
                  {/if}
                </div>
              </div>
              <Money value={row.amount} signed size={15} />
              <Icon name="chevronRight" size={15} stroke={T.inkFaint} />
            </div>
          {/each}
        </Card>
      </div>
    {/each}
  </div>
</div>
