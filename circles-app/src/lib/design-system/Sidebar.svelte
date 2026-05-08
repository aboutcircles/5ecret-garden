<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';
  import Avatar from './Avatar.svelte';
  import CirclesLogo from './CirclesLogo.svelte';
  import Button from './Button.svelte';
  import { CirclesData } from './data.js';

  const SECTIONS = [
    { id: 'wallet',   label: 'Wallet',   icon: 'wallet' },
    { id: 'send',     label: 'Send',     icon: 'send' },
    { id: 'contacts', label: 'Contacts', icon: 'contacts', count: 7 },
    { id: 'groups',   label: 'Groups',   icon: 'groups',   count: 5 },
    { id: 'market',   label: 'Market',   icon: 'market',   count: 124 },
    { id: 'activity', label: 'Activity', icon: 'spark' },
  ];

  interface Props {
    active?: string;
    onNavigate?: (id: string) => void;
    hideMint?: boolean;
  }

  let { active = 'wallet', onNavigate, hideMint }: Props = $props();
  const me = CirclesData.me;
</script>

<aside style="
  width: 248px; flex-shrink: 0; background: {T.surface};
  border-right: 1px solid {T.hairlineSoft};
  display: flex; flex-direction: column;
  padding: 20px 14px 18px; gap: 18px; min-height: 100%;
">
  <!-- Logo -->
  <div style="padding: 4px 10px 0; display: flex; align-items: center; gap: 8px;">
    <CirclesLogo size={26} />
    <span style="
      font-family: {T.fontSans}; font-size: 11px; color: {T.inkSubtle};
      padding: 2px 7px; border-radius: 9999px; background: {T.pageDeep}; font-weight: 580;
      letter-spacing: 0.04em; text-transform: lowercase;
    ">beta</span>
  </div>

  <!-- Account picker -->
  <button style="
    margin: 0 4px; padding: 10px 12px; display: flex; align-items: center; gap: 10px;
    background: {T.surfaceAlt}; border: 1px solid {T.hairline}; border-radius: {T.radius.md}px;
    cursor: pointer; text-align: left;
  ">
    <Avatar seed="shorn" size={32} />
    <div style="flex: 1; min-width: 0;">
      <div style="font-family: {T.fontSans}; font-size: 13.5px; font-weight: 580; color: {T.ink};">{me.name}</div>
      <div style="font-family: {T.fontMono}; font-size: 11px; color: {T.inkMuted}; letter-spacing: 0.01em;">{me.address}</div>
    </div>
    <Icon name="chevronDown" size={16} stroke={T.inkSubtle} />
  </button>

  <!-- Nav -->
  <nav style="display: flex; flex-direction: column; gap: 2px; padding: 0 4px;">
    {#each SECTIONS as s}
      {@const isActive = active === s.id}
      <button onclick={() => onNavigate?.(s.id)} style="
        display: flex; align-items: center; gap: 11px;
        padding: 9px 12px; border-radius: {T.radius.sm}px;
        background: {isActive ? T.primarySoft : 'transparent'};
        color: {isActive ? T.primaryDeep : T.inkBody};
        border: 0; cursor: pointer; text-align: left;
        font-family: {T.fontSans}; font-size: 13.5px; font-weight: {isActive ? 580 : 500};
        transition: background .12s;
      ">
        <Icon name={s.icon} size={17} strokeWidth={isActive ? 1.9 : 1.6} stroke={isActive ? T.primary : T.inkMuted} />
        <span style="flex: 1;">{s.label}</span>
        {#if s.count != null}
          <span style="
            font-size: 11px; font-weight: 580; font-variant-numeric: tabular-nums;
            color: {isActive ? T.primary : T.inkSubtle};
            background: {isActive ? 'rgba(255,255,255,0.7)' : T.pageDeep};
            padding: 2px 7px; border-radius: 9999px;
          ">{s.count}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <!-- Mint nudge -->
  {#if !hideMint}
    <div style="
      margin: 0 4px; padding: 14px;
      border-radius: {T.radius.md}px;
      background: linear-gradient(160deg, {T.coralSoft} 0%, {T.lilacSoft} 100%);
      border: 1px solid {T.hairlineSoft};
      display: flex; flex-direction: column; gap: 8px;
    ">
      <div style="display: flex; align-items: center; gap: 6px;">
        <Icon name="sparkle" size={14} stroke={T.coral} strokeWidth={2} />
        <span style="font-size: 11.5px; font-weight: 600; color: #8A3A1E; letter-spacing: 0.02em; text-transform: uppercase;">Ready to mint</span>
      </div>
      <div style="font-family: {T.fontDisplay}; font-size: 26px; line-height: 1; color: {T.ink}; letter-spacing: -0.015em;">
        146.91 <span style="font-family: {T.fontSans}; font-size: 12px; font-weight: 500; color: {T.inkMuted}; letter-spacing: 0;">CRC</span>
      </div>
      <div style="font-size: 12px; color: {T.inkBody}; line-height: 1.4;">You've been growing for 6 days, 2 hours.</div>
      <Button variant="primary" size="sm" full>Mint now</Button>
    </div>
  {/if}

  <!-- Footer -->
  <div style="margin-top: auto; padding: 8px 8px 0; border-top: 1px solid {T.hairlineSoft};">
    <div style="display: flex; align-items: center; gap: 8px; padding-top: 10px;">
      <Icon name="info" size={14} stroke={T.inkSubtle} />
      <span style="font-size: 11.5px; color: {T.inkSubtle};">Circles v2 · Gnosis Chain</span>
    </div>
  </div>
</aside>
