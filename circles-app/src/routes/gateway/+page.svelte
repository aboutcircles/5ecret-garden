<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import type { Address } from '@circles-sdk/utils';

  // Minimal ABIs
  const factoryAbi = [
    'function createGateway(string name, bytes32 metadataDigest) returns (address)',
    'event GatewayCreated(address indexed owner, address indexed gateway)'
  ];
  const gatewayAbi = [
    'function setTrust(address trustReceiver, uint96 expiry)',
    'function clearTrust(address trustReceiver)'
  ];

  const factoryIface = new ethers.Interface(factoryAbi);
  const gatewayIface = new ethers.Interface(gatewayAbi);

  type GatewayRow = { gateway: string; timestamp?: number; blockNumber?: number; tx?: string };
  type TrustItem = { trustReceiver: string; expiry: number };

  // Local state
  let factoryAddress: string = $state('');
  let gatewayAddress: string = $state('');

  let gatewayName: string = $state('');
  let metadataDigest: string = $state(''); // 0x…32 bytes

  let trustReceiver: string = $state('');
  // default expiry: 1 year from now
  let expiryIso: string = $state(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 16)); // yyyy-MM-ddTHH:mm

  let creating = $state(false);
  let trusting = $state(false);
  let clearing = $state(false);
  let loadingGateways = $state(false);
  let loadingTrusts = $state(false);

  let log: string = $state('');
  const addLog = (msg: string) => (log += `${msg}\n`);

  // Derived
  const ownerAddress = $derived((avatarState.avatar?.address ?? '') as Address | '');

  // Data
  let myGateways: GatewayRow[] = $state([]);
  let selectedGateway: string = $state('');
  let trusts: TrustItem[] = $state([]);

  function onFactoryChange(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    saveFactory(v);
  }
  function onGatewayChange(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    saveGateway(v);
  }

  function saveFactory(addr: string) {
    factoryAddress = (addr || '').trim();
    if (factoryAddress) localStorage.setItem('pg_factory', factoryAddress);
  }
  function saveGateway(addr: string) {
    gatewayAddress = (addr || '').trim();
    if (gatewayAddress) localStorage.setItem('pg_gateway', gatewayAddress);
  }

  function isHex32(v: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(v.trim());
  }
  function isAddress(v: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test((v || '').trim());
  }
  function toExpiryUint96(iso: string): bigint {
    // input like '2025-01-01T12:00'
    try {
      const ms = Date.parse(iso);
      const sec = Math.floor(ms / 1000);
      return BigInt(sec);
    } catch {
      return 0n;
    }
  }

  async function loadMyGateways() {
    if (!ownerAddress || !$circles?.circlesRpc) { myGateways = []; return; }
    try {
      loadingGateways = true;
      const resp = await $circles.circlesRpc.call<{ columns: string[]; rows: any[][] }>('circles_query', [
        {
          Namespace: 'CrcV2_PaymentGateway',
          Table: 'GatewayCreated',
          Columns: ['gateway', 'timestamp', 'transactionHash', 'blockNumber'],
          Filter: [
            { Type: 'FilterPredicate', FilterType: 'Equals', Column: 'owner', Value: ownerAddress.toLowerCase() },
          ],
          Order: [],
        },
      ]);
      const cols = resp?.result?.columns ?? [];
      const rows = resp?.result?.rows ?? [];
      const idxG = cols.indexOf('gateway');
      const idxTs = cols.indexOf('timestamp');
      const idxTx = cols.indexOf('transactionHash');
      const idxBn = cols.indexOf('blockNumber');
      myGateways = rows.map((r) => ({
        gateway: r[idxG] ? ethers.getAddress(r[idxG]) : '',
        timestamp: r[idxTs] ? Number(r[idxTs]) : undefined,
        tx: r[idxTx] ?? undefined,
        blockNumber: r[idxBn] ? Number(r[idxBn]) : undefined,
      }))
      .filter((r) => r.gateway)
      .sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));
    } catch (e) {
      console.error('loadMyGateways', e);
    } finally {
      loadingGateways = false;
    }
  }

  async function loadTrusts(gateway: string) {
    if (!gateway || !$circles?.circlesRpc) { trusts = []; return; }
    try {
      loadingTrusts = true;
      const resp = await $circles.circlesRpc.call<{ columns: string[]; rows: any[][] }>('circles_query', [
        {
          Namespace: 'CrcV2_PaymentGateway',
          Table: 'TrustUpdated',
          Columns: ['trustReceiver', 'expiry', 'blockNumber', 'transactionIndex', 'logIndex'],
          Filter: [
            { Type: 'FilterPredicate', FilterType: 'Equals', Column: 'gateway', Value: gateway.toLowerCase() },
          ],
          Order: [],
        },
      ]);
      const cols = resp?.result?.columns ?? [];
      const rows = resp?.result?.rows ?? [];
      const idxR = cols.indexOf('trustReceiver');
      const idxE = cols.indexOf('expiry');
      const idxB = cols.indexOf('blockNumber');
      const idxTi = cols.indexOf('transactionIndex');
      const idxLi = cols.indexOf('logIndex');
      // Aggregate by latest tuple (blockNumber, transactionIndex, logIndex)
      type Agg = { expiry: number; blockNumber: number; transactionIndex: number; logIndex: number };
      const map = new Map<string, Agg>();
      for (const r of rows) {
        const recv = r[idxR] ? ethers.getAddress(r[idxR]) : '';
        if (!recv) continue;
        const expiryNum = r[idxE] ? Number(r[idxE]) : 0;
        const bn = r[idxB] ? Number(r[idxB]) : 0;
        const ti = r[idxTi] ? Number(r[idxTi]) : 0;
        const li = r[idxLi] ? Number(r[idxLi]) : 0;
        const prev = map.get(recv);
        if (!prev || bn > prev.blockNumber || (bn === prev.blockNumber && (ti > prev.transactionIndex || (ti === prev.transactionIndex && li > prev.logIndex)))) {
          map.set(recv, { expiry: expiryNum, blockNumber: bn, transactionIndex: ti, logIndex: li });
        }
      }
      trusts = Array.from(map.entries()).map(([trustReceiver, v]) => ({ trustReceiver, expiry: v.expiry }));
      // Sort active first, then by receiver address
      const now = Math.floor(Date.now() / 1000);
      trusts.sort((a, b) => {
        const aActive = (a.expiry ?? 0) > now ? 1 : 0;
        const bActive = (b.expiry ?? 0) > now ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return a.trustReceiver.localeCompare(b.trustReceiver);
      });
    } catch (e) {
      console.error('loadTrusts', e);
    } finally {
      loadingTrusts = false;
    }
  }

  async function createGateway() {
    if (!$wallet) {
      addLog('Wallet not connected.');
      return;
    }
    if (!isAddress(factoryAddress)) {
      addLog('Factory address is invalid.');
      return;
    }
    if (!gatewayName) {
      addLog('Please provide a name for the gateway.');
      return;
    }
    if (!isHex32(metadataDigest)) {
      addLog('metadataDigest must be a 0x-prefixed 32-byte hex string.');
      return;
    }

    try {
      creating = true;
      log = '';

      const data = factoryIface.encodeFunctionData('createGateway', [gatewayName, metadataDigest]);

      const tx = await $wallet.sendTransaction!({
        to: factoryAddress,
        value: 0n,
        data
      });
      addLog(`Sent createGateway – tx: ${tx.hash}`);

      // Wait for receipt and parse events
      const receipt = await $wallet.provider.waitForTransaction(tx.hash);
      if (!receipt) {
        addLog('No receipt found.');
      } else {
        addLog(`Confirmed in block ${receipt.blockNumber}`);
        // parse logs for GatewayCreated
        const parsed = (receipt.logs || [])
          .map((log) => {
            try { return factoryIface.parseLog(log); } catch { return null; }
          })
          .filter((x) => x && x.name === 'GatewayCreated');
        if (parsed[0]) {
          const gw = (parsed[0]!.args?.[1] as string) || '';
          if (gw) {
            saveGateway(ethers.getAddress(gw));
            addLog(`Gateway created at ${gatewayAddress}`);
            // Refresh list
            loadMyGateways();
          }
        }
      }
    } catch (e) {
      console.error(e);
      addLog(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      creating = false;
    }
  }

  async function setTrust() {
    if (!$wallet) {
      addLog('Wallet not connected.');
      return;
    }
    if (!isAddress(gatewayAddress)) {
      addLog('Gateway address is invalid.');
      return;
    }
    if (!isAddress(trustReceiver)) {
      addLog('Trust receiver is invalid.');
      return;
    }

    try {
      trusting = true;
      const expiry = toExpiryUint96(expiryIso);
      const data = gatewayIface.encodeFunctionData('setTrust', [trustReceiver, expiry]);
      const tx = await $wallet.sendTransaction!({ to: gatewayAddress, value: 0n, data });
      addLog(`Sent setTrust – tx: ${tx.hash}`);
      await $wallet.provider.waitForTransaction(tx.hash);
      addLog('Trust updated.');
      if (selectedGateway && gatewayAddress.toLowerCase() === selectedGateway.toLowerCase()) {
        await loadTrusts(selectedGateway);
      }
    } catch (e) {
      console.error(e);
      addLog(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      trusting = false;
    }
  }

  async function clearTrust() {
    if (!$wallet) {
      addLog('Wallet not connected.');
      return;
    }
    if (!isAddress(gatewayAddress)) {
      addLog('Gateway address is invalid.');
      return;
    }
    if (!isAddress(trustReceiver)) {
      addLog('Trust receiver is invalid.');
      return;
    }

    try {
      clearing = true;
      const data = gatewayIface.encodeFunctionData('clearTrust', [trustReceiver]);
      const tx = await $wallet.sendTransaction!({ to: gatewayAddress, value: 0n, data });
      addLog(`Sent clearTrust – tx: ${tx.hash}`);
      await $wallet.provider.waitForTransaction(tx.hash);
      addLog('Trust cleared.');
      if (selectedGateway && gatewayAddress.toLowerCase() === selectedGateway.toLowerCase()) {
        await loadTrusts(selectedGateway);
      }
    } catch (e) {
      console.error(e);
      addLog(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearing = false;
    }
  }

  function openGatewayDetail(addr: string) {
    selectedGateway = addr;
    saveGateway(addr);
    loadTrusts(addr);
  }

  onMount(() => {
    try {
      const savedFactory = localStorage.getItem('pg_factory');
      const savedGateway = localStorage.getItem('pg_gateway');
      if (savedFactory) factoryAddress = savedFactory;
      if (savedGateway) gatewayAddress = savedGateway;
      if (factoryAddress) addLog(`Loaded factory ${factoryAddress}`);
      if (gatewayAddress) addLog(`Loaded gateway ${gatewayAddress}`);
    } catch {}
  });

  $effect(() => {
    if (ownerAddress && $circles?.circlesRpc) {
      loadMyGateways();
    }
  });
</script>

<div class="max-w-4xl mx-auto p-6 space-y-6">
  <div class="card shadow-xl">
    <div class="card-body space-y-4">
      <h2 class="card-title">Payment Gateway Factory</h2>

      <label class="form-control w-full">
        <span class="label-text">Factory address</span>
        <input class="input input-bordered w-full font-mono" bind:value={factoryAddress} on:change={onFactoryChange} placeholder="0x..." />
      </label>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="form-control w-full">
          <span class="label-text">Gateway name</span>
          <input class="input input-bordered w-full" bind:value={gatewayName} placeholder="My Shop" />
        </label>
        <label class="form-control w-full">
          <span class="label-text">Metadata digest (bytes32)</span>
          <input class="input input-bordered w-full font-mono" bind:value={metadataDigest} placeholder="0x…64 hex chars" />
        </label>
      </div>

      <button class="btn btn-primary" class:loading={creating} disabled={creating || !$wallet} on:click={createGateway}>
        {creating ? 'Creating…' : 'Create Gateway'}
      </button>

      {#if ownerAddress}
        <div class="text-xs opacity-70">Owner (avatar): <span class="font-mono">{ownerAddress}</span></div>
      {/if}
    </div>
  </div>

  <div class="card shadow-xl">
    <div class="card-body space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="card-title">My Gateways</h2>
        <button class="btn btn-sm" on:click={loadMyGateways} disabled={loadingGateways || !$circles}>Refresh</button>
      </div>
      {#if !$circles}
        <div class="text-sm opacity-70">Connect Circles to load your gateways.</div>
      {:else}
        {#if loadingGateways}
          <div class="loading loading-spinner loading-md"></div>
        {:else if myGateways.length === 0}
          <div class="text-sm opacity-70">No gateways found for your avatar.</div>
        {:else}
          <div class="overflow-x-auto">
            <table class="table table-zebra text-sm">
              <thead>
                <tr>
                  <th>Gateway</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each myGateways as g}
                  <tr>
                    <td class="font-mono">{g.gateway}</td>
                    <td>{g.timestamp ? new Date(Number(g.timestamp) * 1000).toLocaleString() : ''}</td>
                    <td class="text-right">
                      <button class="btn btn-sm btn-outline" on:click={() => openGatewayDetail(g.gateway)}>Open</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <div class="card shadow-xl">
    <div class="card-body space-y-4">
      <h2 class="card-title">Manage Trust</h2>

      <label class="form-control w-full">
        <span class="label-text">Gateway address</span>
        <input class="input input-bordered w-full font-mono" bind:value={gatewayAddress} on:change={onGatewayChange} placeholder="0x..." />
      </label>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="form-control w-full">
          <span class="label-text">Trust receiver</span>
          <input class="input input-bordered w-full font-mono" bind:value={trustReceiver} placeholder="0x..." />
        </label>
        <label class="form-control w-full">
          <span class="label-text">Expiry (UTC)</span>
          <input class="input input-bordered w-full" type="datetime-local" bind:value={expiryIso} />
        </label>
      </div>

      <div class="flex gap-3">
        <button class="btn btn-primary flex-1" class:loading={trusting} disabled={trusting || !$wallet} on:click={setTrust}>
          {trusting ? 'Updating…' : 'Set Trust'}
        </button>
        <button class="btn btn-outline flex-1" class:loading={clearing} disabled={clearing || !$wallet} on:click={clearTrust}>
          {clearing ? 'Clearing…' : 'Clear Trust'}
        </button>
      </div>

      {#if selectedGateway}
        <div class="divider">Trust Relations for {selectedGateway}</div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm opacity-70">Latest expiry per receiver</div>
          <button class="btn btn-xs" on:click={() => loadTrusts(selectedGateway)} disabled={loadingTrusts}>Refresh</button>
        </div>
        {#if loadingTrusts}
          <div class="loading loading-spinner loading-sm"></div>
        {:else if trusts.length === 0}
          <div class="text-sm opacity-70">No trust relations found yet.</div>
        {:else}
          <div class="overflow-x-auto">
            <table class="table text-sm">
              <thead>
                <tr>
                  <th>Receiver</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each trusts as t}
                  {#key t.trustReceiver}
                  <tr>
                    <td class="font-mono">{t.trustReceiver}</td>
                    <td>{t.expiry ? new Date(Number(t.expiry) * 1000).toLocaleString() : ''}</td>
                    <td>
                      {#if t.expiry && t.expiry * 1000 > Date.now()}
                        <span class="badge badge-success">active</span>
                      {:else}
                        <span class="badge">expired</span>
                      {/if}
                    </td>
                    <td class="text-right">
                      <div class="join">
                        <button class="btn btn-xs join-item" on:click={() => { trustReceiver = t.trustReceiver; }}>Fill</button>
                        <button class="btn btn-xs btn-outline join-item" on:click={() => { trustReceiver = t.trustReceiver; clearTrust(); }}>Clear</button>
                      </div>
                    </td>
                  </tr>
                  {/key}
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <div class="card shadow">
    <div class="card-body">
      <h3 class="font-semibold">Activity</h3>
      <pre class="p-3 border rounded-md h-56 overflow-y-auto whitespace-pre-wrap text-xs">{log}</pre>
    </div>
  </div>
</div>
