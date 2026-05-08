<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';

  interface Props {
    active?: string;
    onNav?: (id: string) => void;
  }

  let { active = 'wallet', onNav }: Props = $props();

  const tabs = [
    { id: 'wallet',   icon: 'wallet',   label: 'Wallet',  fab: false },
    { id: 'contacts', icon: 'contacts', label: 'People',  fab: false },
    { id: 'send',     icon: 'send',     label: null,      fab: true  },
    { id: 'groups',   icon: 'groups',   label: 'Groups',  fab: false },
    { id: 'market',   icon: 'market',   label: 'Market',  fab: false },
  ];
</script>

<div style="
  position: absolute; left: 12px; right: 12px; bottom: 44px; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px; height: 64px;
  background: {T.surface};
  border-radius: 9999px;
  box-shadow: 0 6px 18px rgba(15,10,30,0.10), 0 24px 48px rgba(15,10,30,0.12), 0 0 0 1px rgba(15,10,30,0.04);
">
  {#each tabs as t}
    {#if t.fab}
      <button onclick={() => onNav?.(t.id)} style="
        width: 52px; height: 52px; border-radius: 9999px; border: 0; cursor: pointer;
        background: {T.primary}; color: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(88,73,212,0.5), inset 0 1px 0 rgba(255,255,255,0.18);
      "><Icon name={t.icon} size={22} stroke="#fff" strokeWidth={2} /></button>
    {:else}
      {@const isActive = t.id === active}
      <button onclick={() => onNav?.(t.id)} style="
        flex: 1; height: 52px; border-radius: 9999px; border: 0; cursor: pointer;
        background: {isActive ? T.primarySoft : 'transparent'};
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      ">
        <Icon name={t.icon} size={19} stroke={isActive ? T.primaryDeep : T.inkMuted} strokeWidth={isActive ? 1.9 : 1.6} />
        <span style="font-size: 10px; font-weight: 580; color: {isActive ? T.primaryDeep : T.inkMuted};">{t.label}</span>
      </button>
    {/if}
  {/each}
</div>
