<script lang="ts">
  import { getConnectors, connect } from '@wagmi/core';
  import { config } from '../../../../../config';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/shared/state/popup';
  import { openStep } from '$lib/shared/flow';
  import { signer, clearSession } from '$lib/shared/state/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import ImportCircles from '$lib/areas/wallet/ui/onboarding/ImportCircles.svelte';
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import { setConnectorId } from '$lib/shared/state/connector';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  const connectors = getConnectors(config);
  let connectingId: string | null = $state(null);
  let connectError: string | null = $state(null);

  async function handleConnect(connector: ReturnType<typeof getConnectors>[number]) {
    connectingId = connector.id;
    connectError = null;
    try {
      await clearSession();
      const result = await connect(config, { connector, chainId: 100 });
      setConnectorId(connector.id);
      const addr0 = (result as any)?.accounts?.[0];
      if (typeof addr0 === 'string' && addr0) {
        signer.address = addr0.toLowerCase() as Address;
      } else {
        console.warn('No account returned by connector', connector?.id, result);
      }
      popupControls.closeAndThen(() => {
        void goto('/connect-wallet/connect-safe/');
      });
    } catch (e: any) {
      connectError = e?.shortMessage ?? e?.message ?? 'Connection cancelled';
      console.error('Wallet connect failed', e);
    } finally {
      connectingId = null;
    }
  }

  async function openMagicWords() {
    const pk = CirclesStorage.getInstance().privateKey;
    if (pk) {
      popupControls.closeAndThen(() => {
        void goto('/connect-wallet/import-circles-garden');
      });
      return;
    }
    openStep({
      component: ImportCircles,
      title: 'Use circles magic words',
    });
  }

  function tintFor(name: string): { bg: string; ink: string; glyph: string } {
    const lower = name.toLowerCase();
    if (lower.includes('metamask')) return { bg: '#FBE3D8', ink: '#8A3A1E', glyph: '🦊' };
    if (lower.includes('walletconnect')) return { bg: '#EAE7FB', ink: T.primaryDeep, glyph: '🔗' };
    if (lower.includes('coinbase')) return { bg: '#EEEBFA', ink: T.primaryDeep, glyph: '🔵' };
    if (lower.includes('safe')) return { bg: '#DCEBDF', ink: '#1F5E37', glyph: '🛡' };
    if (lower.includes('rabby')) return { bg: '#FBEFCB', ink: '#7B5215', glyph: '🐰' };
    if (lower.includes('injected') || lower.includes('browser')) return { bg: T.pageDeep, ink: T.inkBody, glyph: '🌐' };
    return { bg: T.pageDeep, ink: T.inkBody, glyph: '👛' };
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;padding-bottom:4px;">
  <!-- Hero / intro -->
  <div style="
    border-radius:18px;padding:20px 18px 18px;
    background:linear-gradient(160deg,{T.lilacSoft} 0%,{T.coralSoft} 60%,{T.butterSoft} 100%);
    position:relative;overflow:hidden;
  ">
    <div style="display:flex;flex-direction:column;gap:4px;position:relative;">
      <span style="
        display:inline-flex;align-items:center;align-self:flex-start;
        padding:3px 10px;border-radius:9999px;
        background:{T.ink};color:{T.butter};
        font-size:10.5px;font-weight:580;letter-spacing:0.04em;text-transform:lowercase;
      ">connect</span>
      <span style="font-family:{T.fontDisplay};font-size:26px;color:{T.ink};letter-spacing:-0.02em;line-height:1.1;margin-top:6px;">
        Pick your wallet
      </span>
      <span style="font-size:13px;color:{T.inkBody};line-height:1.5;">
        Choose how you'd like to sign into Circles. You can change this later.
      </span>
    </div>
  </div>

  {#if connectError}
    <div style="
      padding:12px 14px;border-radius:12px;
      background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);
      display:flex;align-items:center;gap:8px;
    ">
      <Icon name="info" size={14} stroke={T.negative} strokeWidth={2} />
      <span style="font-size:12.5px;color:{T.negative};">{connectError}</span>
    </div>
  {/if}

  <!-- Wallet connectors -->
  <div style="display:flex;flex-direction:column;gap:8px;">
    {#each connectors as connector}
      {@const tint = tintFor(connector.name)}
      {@const isConnecting = connectingId === connector.id}
      <button
        id={connector.id}
        type="button"
        disabled={isConnecting || !!connectingId}
        onclick={() => handleConnect(connector)}
        style="
          display:flex;align-items:center;gap:14px;width:100%;
          padding:14px 16px;border-radius:16px;cursor:pointer;text-align:left;
          background:{T.surface};border:1px solid {T.hairlineSoft};
          box-shadow:{T.shadow.xs};
          transition:transform .08s ease-out,border-color .15s ease-out,box-shadow .15s ease-out;
          opacity:{!isConnecting && connectingId ? 0.5 : 1};
        "
      >
        <div style="
          width:42px;height:42px;border-radius:13px;flex-shrink:0;
          background:{tint.bg};color:{tint.ink};
          display:inline-flex;align-items:center;justify-content:center;
          font-size:20px;line-height:1;
        ">{tint.glyph}</div>

        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;">
          <span style="font-family:{T.fontSans};font-size:14px;font-weight:580;color:{T.ink};letter-spacing:-0.005em;">
            {connector.name}
          </span>
          <span style="font-size:11.5px;color:{T.inkMuted};">
            {connector.type === 'injected' ? 'Browser extension' : connector.type === 'walletConnect' ? 'Mobile QR / deep link' : 'External wallet'}
          </span>
        </div>

        {#if isConnecting}
          <svg class="sw-spin" style="width:12px;height:12px;color:{T.primary};flex-shrink:0;" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
          </svg>
        {:else}
          <Icon name="chevronRight" size={14} stroke={T.inkFaint} />
        {/if}
      </button>
    {/each}

    <!-- Divider -->
    <div style="display:flex;align-items:center;gap:8px;margin:6px 4px;">
      <span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>
      <span style="font-size:10.5px;font-weight:580;color:{T.inkSubtle};letter-spacing:0.06em;text-transform:uppercase;">or</span>
      <span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>
    </div>

    <!-- Circles.garden / magic words -->
    <button
      type="button"
      onclick={openMagicWords}
      style="
        display:flex;align-items:center;gap:14px;width:100%;
        padding:14px 16px;border-radius:16px;cursor:pointer;text-align:left;
        background:{T.surface};border:1px solid {T.hairlineSoft};
        box-shadow:{T.shadow.xs};
        transition:transform .08s,border-color .15s,box-shadow .15s;
      "
    >
      <div style="
        width:42px;height:42px;border-radius:13px;flex-shrink:0;
        background:{T.coralSoft};color:#8A3A1E;
        display:inline-flex;align-items:center;justify-content:center;
      ">
        <Icon name="sparkle" size={18} stroke="#8A3A1E" strokeWidth={2} />
      </div>

      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;">
        <span style="font-family:{T.fontSans};font-size:14px;font-weight:580;color:{T.ink};letter-spacing:-0.005em;">
          Circles.garden
        </span>
        <span style="font-size:11.5px;color:{T.inkMuted};">Import with magic words (seed phrase)</span>
      </div>

      <Icon name="chevronRight" size={14} stroke={T.inkFaint} />
    </button>
  </div>

  <!-- Footer info -->
  <div style="display:flex;align-items:flex-start;gap:8px;padding:4px 4px 0;">
    <Icon name="shield" size={13} stroke={T.inkMuted} style="flex-shrink:0;margin-top:2px;" />
    <span style="font-size:11.5px;color:{T.inkMuted};line-height:1.5;">
      Your wallet signs every action. Keys stay with your wallet — Circles servers never see them.
    </span>
  </div>
</div>

<style>
  @keyframes sw-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .sw-spin { animation: sw-spin 0.9s linear infinite; }
</style>
