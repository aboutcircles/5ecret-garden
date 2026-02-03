<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';

  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { SearchProfileResult } from '$lib/profiles';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { runTask } from '$lib/utils/tasks';

  import TrustRowView from '$lib/gateway/TrustRow.svelte';
  import type { TrustRow } from '$lib/gateway/types';

  interface Props {
    gateway: string;
  }

  let { gateway }: Props = $props();

  const gatewayAbi = ['function setTrust(address trustReceiver, uint192 expiry)'];
  const gatewayIface = new ethers.Interface(gatewayAbi);

  let trustReceiver: string = $state('');

  let searchOpen = $state(false);
  let searchResults = $state<SearchProfileResult[]>([]);
  let searchLoading = $state(false);
  let searchError = $state<string | null>(null);
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  const avatarTypes = [
    'CrcV2_RegisterHuman',
    'CrcV2_RegisterOrganization',
    'CrcV2_RegisterGroup'
  ];

  function toSearchResult(raw: any | null | undefined): SearchProfileResult | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const base = raw ?? { name: '' };
    const address =
      typeof raw.address === 'string'
        ? raw.address
        : typeof raw.owner === 'string'
          ? raw.owner
          : '';
    const lastUpdatedAt = typeof raw.lastUpdatedAt === 'number' ? raw.lastUpdatedAt : undefined;
    const registeredName =
      typeof raw.registeredName === 'string' ? raw.registeredName : null;
    const avatarType =
      typeof raw.avatarType === 'string'
        ? raw.avatarType
        : typeof raw.type === 'string'
          ? raw.type
          : undefined;

    return {
      address,
      name: base.name,
      description: base.description,
      lastUpdatedAt,
      registeredName,
      imageUrl: base.imageUrl,
      previewImageUrl: base.previewImageUrl,
      location: base.location,
      avatarType
    } as SearchProfileResult;
  }

  async function searchProfiles(query: string) {
    if (!$circles?.circlesRpc) {
      searchResults = [];
      return;
    }

    const q = query.trim();
    if (!q) {
      searchResults = [];
      return;
    }

    searchLoading = true;
    searchError = null;
    try {
      const raw = await $circles.circlesRpc.call('circles_searchProfiles', [
        q,
        50,
        0,
        avatarTypes
      ]);
      const results = (raw?.result ?? []).map(toSearchResult).filter(Boolean) as SearchProfileResult[];

      const needle = q.toLowerCase();
      const found = results.some((r) => (r.address ?? '').toLowerCase() === needle);
      if (!found && ethers.isAddress(q)) {
        results.unshift({
          address: q,
          name: q,
          lastUpdatedAt: undefined,
          registeredName: null
        } as SearchProfileResult);
      }

      searchResults = results;
    } catch (error) {
      searchError = error instanceof Error ? error.message : 'Failed to search profiles.';
      searchResults = [];
    } finally {
      searchLoading = false;
    }
  }

  function handleSearchInput(event: Event) {
    trustReceiver = (event.target as HTMLInputElement).value;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      void searchProfiles(trustReceiver ?? '');
    }, 250);
  }

  function handlePaste(event: ClipboardEvent) {
    const paste = event.clipboardData?.getData('text') ?? '';
    if (!paste) return;
    trustReceiver = paste.trim();
    searchOpen = false;
  }

  function selectReceiver(address: string) {
    trustReceiver = address;
    searchOpen = false;
  }

  const trustExpiryMax = (1n << 192n) - 1n;
  const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000));

  let loadingTrusts: boolean = $state(false);
  let trusts: TrustRow[] = $state([]);

  function isAddress(v: string): boolean {
    try {
      ethers.getAddress((v || '').trim());
      return true;
    } catch {
      return false;
    }
  }

  const gatewayValid = $derived(isAddress(gateway));
  const trustReceiverValid = $derived(isAddress(trustReceiver));

  const canSet = $derived(gatewayValid && trustReceiverValid);
  const canClear = $derived(gatewayValid && trustReceiverValid);

  async function loadTrusts() {
    if (!gatewayValid || !$circles?.circlesRpc) {
      trusts = [];
      return;
    }

    try {
      loadingTrusts = true;
      const resp = await $circles.circlesRpc.call<{
        columns: string[];
        rows: any[][];
      }>('circles_query', [
        {
          Namespace: 'CrcV2_PaymentGateway',
          Table: 'TrustUpdated',
          Columns: [
            'trustReceiver',
            'expiry',
            'blockNumber',
            'transactionIndex',
            'logIndex'
          ],
          Filter: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'gateway',
              Value: gateway.toLowerCase()
            }
          ],
          Order: []
        }
      ]);

      const cols = resp?.result?.columns ?? [];
      const rows = resp?.result?.rows ?? [];

      const idxR = cols.indexOf('trustReceiver');
      const idxE = cols.indexOf('expiry');
      const idxB = cols.indexOf('blockNumber');
      const idxTi = cols.indexOf('transactionIndex');
      const idxLi = cols.indexOf('logIndex');

      type Agg = {
        expiry: number;
        blockNumber: number;
        transactionIndex: number;
        logIndex: number;
      };

      const map = new Map<string, Agg>();

      for (const r of rows) {
        const recv = r[idxR] ? ethers.getAddress(r[idxR]) : '';
        if (!recv) continue;
        const expiryNum = r[idxE] ? Number(r[idxE]) : 0;
        const bn = r[idxB] ? Number(r[idxB]) : 0;
        const ti = r[idxTi] ? Number(r[idxTi]) : 0;
        const li = r[idxLi] ? Number(r[idxLi]) : 0;
        const prev = map.get(recv);

        if (
          !prev ||
          bn > prev.blockNumber ||
          (bn === prev.blockNumber &&
            (ti > prev.transactionIndex ||
              (ti === prev.transactionIndex && li > prev.logIndex)))
        ) {
          map.set(recv, {
            expiry: expiryNum,
            blockNumber: bn,
            transactionIndex: ti,
            logIndex: li
          });
        }
      }

      const now = Math.floor(Date.now() / 1000);

      const entries: TrustRow[] = Array.from(map.entries()).map(
        ([trustReceiver, v]) => ({
          trustReceiver,
          expiry: v.expiry,
          blockNumber: v.blockNumber,
          transactionIndex: v.transactionIndex,
          logIndex: v.logIndex
        })
      );

      entries.sort((a, b) => {
        const aActive = (a.expiry ?? 0) > now ? 1 : 0;
        const bActive = (b.expiry ?? 0) > now ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return a.trustReceiver.localeCompare(b.trustReceiver);
      });

      trusts = entries;
    } catch (e) {
      console.error('loadTrusts', e);
      trusts = [];
    } finally {
      loadingTrusts = false;
    }
  }

  onMount(loadTrusts);

  async function setTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canSet) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    await runTask({
      name: 'Updating trust…',
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [
          trustReceiver,
          trustExpiryMax
        ]);
        const tx = await $wallet.sendTransaction!({
          to: gateway,
          value: 0n,
          data
        });
        await $wallet.provider.waitForTransaction(tx.hash);
        await loadTrusts();
      })()
    });
  }

  async function clearTrust() {
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }
    if (!canClear) {
      throw new Error('Please provide a valid gateway and receiver.');
    }

    await runTask({
      name: 'Clearing trust…',
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [
          trustReceiver,
          nowSeconds()
        ]);
        const tx = await $wallet.sendTransaction!({
          to: gateway,
          value: 0n,
          data
        });
        await $wallet.provider.waitForTransaction(tx.hash);
        await loadTrusts();
      })()
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-4">
    <div class="flex flex-col gap-1">
      <Avatar address={gateway} view="horizontal" clickable={false} />
      <div class="font-mono text-xs text-base-content/70 break-all">
        {gateway}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
      <label class="form-control w-full">
        <span class="label-text">Trust receiver</span>
        <div class="dropdown dropdown-bottom w-full" class:dropdown-open={searchOpen}>
          <input
            type="text"
            class="input input-bordered w-full font-mono"
            placeholder="gibber"
            value={trustReceiver}
            oninput={handleSearchInput}
            onpaste={handlePaste}
            onfocus={() => {
              searchOpen = true;
              void searchProfiles(trustReceiver ?? '');
            }}
            onblur={() => {
              setTimeout(() => {
                searchOpen = false;
              }, 150);
            }}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
          />

          {#if searchOpen}
            <div class="dropdown-content z-[50] card card-compact w-full bg-base-100 shadow border border-base-300 mt-1">
              <div class="card-body gap-2">
                {#if searchError}
                  <p class="text-xs text-error break-words">{searchError}</p>
                {:else if searchLoading}
                  <p class="text-xs opacity-70">Searching…</p>
                {:else if searchResults.length === 0}
                  <p class="text-xs opacity-70">No matches yet.</p>
                {:else}
                  <div class="max-h-64 overflow-auto">
                    <ul class="menu menu-sm bg-base-100 w-full">
                      {#each searchResults as profile (profile.address)}
                        <li>
                          <button
                            type="button"
                            class="justify-start"
                            onclick={() => selectReceiver(profile.address)}
                          >
                            <div class="min-w-0 flex flex-col gap-0.5">
                              <Avatar
                                address={profile.address}
                                view="horizontal"
                                clickable={false}
                              />
                              <span class="text-xs font-mono opacity-70 break-all">
                                {profile.address}
                              </span>
                            </div>
                          </button>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </label>
    </div>

    <div class="flex gap-3 mt-2">
      <button
        type="button"
        class="btn btn-primary flex-1"
        onclick={setTrust}
        disabled={!canSet}
      >
        Set trust
      </button>
      <button
        type="button"
        class="btn btn-outline flex-1"
        onclick={clearTrust}
        disabled={!canClear}
      >
        Clear trust
      </button>
    </div>

    <div class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm opacity-70">Latest expiry per receiver</div>
        <button
          type="button"
          class="btn btn-xs btn-ghost"
          onclick={loadTrusts}
          disabled={loadingTrusts}
        >
          Refresh
        </button>
      </div>

      {#if loadingTrusts}
        <div class="loading loading-spinner loading-sm"></div>
      {:else if trusts.length === 0}
        <div class="text-sm opacity-70">No trust relations found yet.</div>
      {:else}
        <div class="flex flex-col gap-1.5">
          {#each trusts as item (item.trustReceiver)}
            <TrustRowView {item} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</FlowDecoration>
