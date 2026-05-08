<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Money from '../../Money.svelte';
  import MobileShell from '../../MobileShell.svelte';
  import MobileHeader from '../../MobileHeader.svelte';

  const me = CirclesData.me;
  const activity = CirclesData.activity.slice(0, 4);
  const px = 18;
</script>

<MobileShell active="wallet">
  {#snippet header()}<MobileHeader />{/snippet}

  <div style="padding: 8px {px}px 0;">
    <!-- Hero card -->
    <div style="
      padding: 24px 22px 22px; border-radius: 24px;
      background: radial-gradient(120% 140% at 100% 0%, {T.lilacSoft} 0%, {T.surface} 65%);
      border: 1px solid {T.hairlineSoft};
      box-shadow: {T.shadow.sm};
    ">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Total balance</span>
          <div style="margin-top:2px;"><Pill color="sage">+ 24.00 today</Pill></div>
        </div>
        <button style="width:36px;height:36px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:{T.shadow.xs};">
          <Icon name="more" size={16} stroke={T.inkBody} />
        </button>
      </div>
      <div style="font-family:{T.fontDisplay};font-size:64px;line-height:1;color:{T.ink};letter-spacing:-0.025em;margin-top:14px;font-weight:400;">
        {me.balance.toFixed(2)}<span style="margin-left:8px;font-family:{T.fontSans};font-size:16px;font-weight:500;color:{T.inkMuted};">CRC</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:3px;background:{T.coral};display:inline-block;"></span><span style="font-size:12px;color:{T.inkBody};"><b style="color:{T.ink};">{me.fromPeople}</b> people</span></div>
        <div style="display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:3px;background:{T.primary};display:inline-block;"></span><span style="font-size:12px;color:{T.inkBody};"><b style="color:{T.ink};">{me.fromGroups}</b> groups</span></div>
        <div style="display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:3px;background:{T.sage};display:inline-block;"></span><span style="font-size:12px;color:{T.inkBody};">depth <b style="color:{T.ink};">4</b></span></div>
      </div>
      <!-- Action row -->
      <div style="display:flex;align-items:center;gap:8px;margin-top:18px;">
        {#each [
          { label: 'Send',    icon: 'send',    primary: true },
          { label: 'Receive', icon: 'receive', primary: false },
          { label: 'Trust',   icon: 'trust',   primary: false },
          { label: 'Scan',    icon: 'scan',    primary: false },
        ] as a}
          <button style="
            flex:1;height:56px;border-radius:16px;cursor:pointer;
            background:{a.primary ? T.primary : T.surface};
            border:{a.primary ? 'none' : `1px solid ${T.hairline}`};
            color:{a.primary ? '#fff' : T.ink};
            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
            box-shadow:{a.primary ? '0 4px 12px rgba(88,73,212,0.3)' : 'none'};
          ">
            <Icon name={a.icon} size={18} stroke={a.primary ? '#fff' : T.inkBody} strokeWidth={1.8} />
            <span style="font-size:11px;font-weight:580;">{a.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Mintable nudge -->
    <div style="
      margin-top:14px;padding:14px 16px;border-radius:18px;
      background:linear-gradient(160deg,{T.coralSoft} 0%,{T.lilacSoft} 100%);
      display:flex;align-items:center;gap:12px;
    ">
      <div style="width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <Icon name="sparkle" size={20} stroke={T.coral} strokeWidth={2} />
      </div>
      <div style="display:flex;flex-direction:column;gap:1px;flex:1;">
        <span style="font-size:11px;font-weight:600;color:#8A3A1E;letter-spacing:0.04em;text-transform:uppercase;">Ready to mint</span>
        <div style="display:flex;align-items:baseline;gap:6px;">
          <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};line-height:1;letter-spacing:-0.015em;">146.91</span>
          <span style="font-size:11px;color:{T.inkMuted};font-weight:500;">CRC growing</span>
        </div>
      </div>
      <Button variant="primary" size="sm">Mint</Button>
    </div>

    <!-- Activity heading -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:22px;margin-bottom:10px;padding:0 4px;">
      <span style="font-size:12px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Today</span>
      <button style="background:transparent;border:0;font-size:12.5px;font-weight:580;color:{T.primary};cursor:pointer;">See all →</button>
    </div>

    <!-- Activity list -->
    <div style="background:{T.surface};border-radius:20px;border:1px solid {T.hairlineSoft};overflow:hidden;">
      {#each activity as row, i}
        {@const isPositive = row.amount >= 0}
        {@const isMint = row.kind === 'mint'}
        <div style="display:grid;grid-template-columns:36px 1fr auto;gap:12px;align-items:center;padding:12px 14px;border-bottom:{i<activity.length-1?`1px solid ${T.hairlineSoft}`:'none'};">
          <div style="position:relative;">
            {#if isMint}
              <div style="width:36px;height:36px;border-radius:50%;background:{T.butterSoft};display:flex;align-items:center;justify-content:center;"><Icon name="sparkle" size={15} stroke="#B07014" strokeWidth={2} /></div>
            {:else if row.avatar === 'token'}
              <Avatar seed={row.who} size={36} kind="token" />
            {:else if row.avatar === 'group'}
              <Avatar seed={row.who} size={36} icon="groups" />
            {:else}
              <Avatar seed={row.who} size={36} />
            {/if}
            <span style="position:absolute;right:-2px;bottom:-2px;width:14px;height:14px;border-radius:50%;background:{isMint?T.butter:isPositive?T.sage:T.coral};display:flex;align-items:center;justify-content:center;border:2px solid {T.surface};">
              <Icon name={isMint?'plus':isPositive?'receive':'send'} size={7} strokeWidth={2.6} stroke="#fff" />
            </span>
          </div>
          <div style="display:flex;flex-direction:column;gap:1px;">
            <span style="font-size:13.5px;font-weight:540;color:{T.ink};line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">{row.who}</span>
            <span style="font-size:11.5px;color:{T.inkMuted};">{row.when}</span>
          </div>
          <Money value={row.amount} signed size={13} />
        </div>
      {/each}
    </div>
    <div style="height:24px;"></div>
  </div>
</MobileShell>
