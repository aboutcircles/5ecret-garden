<script lang="ts">
  import { get } from 'svelte/store';
  import { version } from '$app/environment';
  import { T } from '$lib/design-system/tokens.js';
  import { circles } from '$lib/shared/state/circles';
  import { isWebsocketConnected } from '$lib/shared/state/realtimeSync';
  import { settings, getActiveConfig } from '$lib/shared/state/settings.svelte';

  // The active config the SDK was initialised with (incl. any custom URL overrides).
  const config = getActiveConfig();

  const network = $derived(
    settings.network === 'chiado'
      ? { name: 'Chiado', chainId: 10200, testnet: true }
      : { name: 'Gnosis Chain', chainId: 100, testnet: false },
  );

  // The websocket flag is a plain (non-reactive) field on the SDK rpc client, so poll it
  // while the popup is open to keep the realtime indicator live.
  let wsConnected = $state<boolean | undefined>(undefined);
  $effect(() => {
    const tick = () => {
      wsConnected = isWebsocketConnected(get(circles));
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      clearInterval(id);
      clearTimeout(copyTimer);
    };
  });

  const realtime = $derived(
    wsConnected === true
      ? { label: 'Connected', color: T.positive }
      : wsConnected === false
        ? { label: 'Disconnected', color: T.negative }
        : { label: 'Unknown', color: T.inkFaint },
  );

  let copied = $state<string | null>(null);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  async function copy(value: string | undefined, key: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copied = key;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = null), 1200);
    } catch (e) {
      console.warn('[EnvInfo] clipboard write failed', e);
    }
  }

  const short = (addr?: string) =>
    addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : (addr ?? '—');

  // Address rows shown in the popup. Zero-address entries (unset on this network) are
  // filtered out so the list only shows contracts that actually exist here.
  const ZERO = '0x0000000000000000000000000000000000000000';
  const contracts = $derived(
    (
      [
        ['Hub v2', config.v2HubAddress],
        ['Hub v1', config.v1HubAddress],
        ['Name registry', config.nameRegistryAddress],
        ['Migration', config.migrationAddress],
      ] as [string, string | undefined][]
    ).filter(([, addr]) => addr && addr.toLowerCase() !== ZERO),
  );

  const endpoints = $derived(
    (
      [
        ['Circles RPC', config.circlesRpcUrl],
        ['Pathfinder', config.pathfinderUrl],
      ] as [string, string | undefined][]
    ).filter(([, url]) => !!url),
  );
</script>

<div style="display:flex;flex-direction:column;gap:18px;padding:4px 2px 8px;color:{T.inkBody};font-family:{T.fontSans};">
  <!-- Network + realtime summary -->
  <div style="display:flex;flex-direction:column;gap:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Network</span>
      <span style="font-size:13px;color:{T.ink};font-weight:560;">
        {network.name}
        <span style="color:{T.inkMuted};font-weight:500;">· chain {network.chainId}</span>
      </span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Mode</span>
      <span style="font-size:13px;color:{T.ink};font-weight:560;">
        {settings.ring ? 'Rings (experimental)' : 'Production'}
      </span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Realtime</span>
      <span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;color:{T.ink};font-weight:560;">
        <span style="width:8px;height:8px;border-radius:9999px;background:{realtime.color};" aria-hidden="true"></span>
        {realtime.label}
      </span>
    </div>
  </div>

  <!-- Endpoints -->
  {#if endpoints.length}
    <div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid {T.hairlineSoft};padding-top:14px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Endpoints</span>
      {#each endpoints as [label, url]}
        <button
          type="button"
          onclick={() => copy(url, label)}
          title={url}
          style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:transparent;border:0;padding:4px 0;cursor:pointer;text-align:left;width:100%;"
        >
          <span style="font-size:13px;color:{T.inkBody};">{label}</span>
          <span style="font-family:{T.fontMono};font-size:11.5px;color:{T.inkMuted};max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            {copied === label ? 'Copied ✓' : url}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Contracts -->
  {#if contracts.length}
    <div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid {T.hairlineSoft};padding-top:14px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Contracts</span>
      {#each contracts as [label, addr]}
        <button
          type="button"
          onclick={() => copy(addr, label)}
          title={addr}
          style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:transparent;border:0;padding:4px 0;cursor:pointer;text-align:left;width:100%;"
        >
          <span style="font-size:13px;color:{T.inkBody};">{label}</span>
          <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkMuted};">
            {copied === label ? 'Copied ✓' : short(addr)}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Build -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid {T.hairlineSoft};padding-top:14px;">
    <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">App build</span>
    <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkMuted};">{version}</span>
  </div>
</div>
