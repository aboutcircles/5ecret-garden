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
      wsConnected = isWebsocketConnected();
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

  // The RPC URL the SDK's client is actually pointed at — read from the live client so it
  // can't drift from a stale config value. The pathfinder URL is deliberately NOT shown:
  // nothing in the app sends requests to it (pathfinding routes through the Circles RPC), so
  // displaying it would be misleading.
  const rpcUrl =
    (get(circles) as unknown as { rpc?: { client?: { getRpcUrl?: () => string } } })
      ?.rpc?.client?.getRpcUrl?.() ?? config.circlesRpcUrl;

  // Contract rows. Zero-address entries (unset on this network) are filtered out.
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

  <!-- RPC: the endpoint the SDK actually calls (full URL, click to copy) -->
  {#if rpcUrl}
    <div style="display:flex;flex-direction:column;gap:6px;border-top:1px solid {T.hairlineSoft};padding-top:14px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">RPC</span>
      <button
        type="button"
        onclick={() => copy(rpcUrl, 'rpc')}
        title={rpcUrl}
        style="display:flex;background:transparent;border:0;padding:2px 0;cursor:pointer;text-align:left;width:100%;"
      >
        <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkMuted};word-break:break-all;line-height:1.45;">
          {copied === 'rpc' ? 'Copied ✓' : rpcUrl}
        </span>
      </button>
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
          title={`${label} — click to copy`}
          style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:transparent;border:0;padding:2px 0;cursor:pointer;text-align:left;width:100%;"
        >
          <span style="font-size:12px;color:{T.inkBody};">{label}{copied === label ? ' · copied ✓' : ''}</span>
          <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkMuted};word-break:break-all;line-height:1.45;">{addr}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Build: git short hash of the deployed commit (see svelte.config.js) -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid {T.hairlineSoft};padding-top:14px;">
    <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Build</span>
    <span style="font-family:{T.fontMono};font-size:12px;color:{T.inkMuted};">{version}</span>
  </div>
</div>
