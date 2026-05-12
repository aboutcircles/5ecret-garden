<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import { circlesBalances } from '$lib/shared/state/circlesBalances';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { SEND_FLOW_SCAFFOLD_BASE, SEND_POPUP_TITLE } from './constants';
  import { popupControls } from '$lib/shared/state/popup';
  import { popToOrOpen } from '$lib/shared/flow';
  import AmountStep from './3_Amount.svelte';
  import { tick } from 'svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';

  type ReturnMode = 'next' | 'back';

  interface Props {
    context: SendFlowContext;
    returnMode?: ReturnMode;
  }

  let { context = $bindable(), returnMode = 'next' }: Props = $props();

  let query = $state('');
  let includeSet = $state(new Set<string>((context.fromTokens ?? []).map((v) => String(v).toLowerCase())));
  let excludeSet = $state(new Set<string>((context.excludeFromTokens ?? []).map((v) => String(v).toLowerCase())));

  const tokenOptions = $derived.by(() => {
    const map = new Map<string, TokenBalanceRow>();
    for (const item of $circlesBalances?.data ?? []) {
      const tokenAddress = String(item.tokenAddress ?? '').toLowerCase();
      if (!tokenAddress) continue;
      if (!map.has(tokenAddress)) {
        map.set(tokenAddress, item);
      }
    }
    const values = Array.from(map.values());
    const q = query.trim().toLowerCase();
    if (!q) return values;
    return values.filter((item) => {
      const token = String(item.tokenAddress ?? '').toLowerCase();
      const owner = String(item.tokenOwner ?? '').toLowerCase();
      return token.includes(q) || owner.includes(q);
    });
  });

  const allTokenKeys = $derived.by(() => {
    const keys = new Set<string>();
    for (const item of $circlesBalances?.data ?? []) {
      const tokenAddress = String(item.tokenAddress ?? '').toLowerCase();
      if (!tokenAddress) continue;
      keys.add(tokenAddress);
    }
    return Array.from(keys);
  });

  function normalize(address: string | undefined): string {
    return String(address ?? '').toLowerCase();
  }

  function setInclude(address: string): void {
    const key = normalize(address);
    const nextInclude = new Set(includeSet);
    const nextExclude = new Set(excludeSet);

    if (nextInclude.has(key)) {
      nextInclude.delete(key);
    } else {
      nextInclude.add(key);
      nextExclude.delete(key);
    }

    includeSet = nextInclude;
    excludeSet = nextExclude;
  }

  function setExclude(address: string): void {
    const key = normalize(address);
    const nextInclude = new Set(includeSet);
    const nextExclude = new Set(excludeSet);

    if (nextExclude.has(key)) {
      nextExclude.delete(key);
    } else {
      nextExclude.add(key);
      nextInclude.delete(key);
    }

    includeSet = nextInclude;
    excludeSet = nextExclude;
  }

  function includeAll(): void {
    includeSet = new Set(allTokenKeys);
    excludeSet = new Set();
  }

  function excludeAll(): void {
    excludeSet = new Set(allTokenKeys);
    includeSet = new Set();
  }

  function mapToOriginalAddresses(keys: Set<string>): Address[] {
    const byLower = new Map<string, Address>();
    for (const item of $circlesBalances?.data ?? []) {
      const token = item.tokenAddress as Address | undefined;
      if (!token) continue;
      const lower = String(token).toLowerCase();
      if (!byLower.has(lower)) {
        byLower.set(lower, token);
      }
    }

    return Array.from(keys)
      .map((k) => byLower.get(k))
      .filter((v): v is Address => Boolean(v));
  }

  async function applyFilters(): Promise<void> {
    const include = mapToOriginalAddresses(includeSet);
    const exclude = mapToOriginalAddresses(excludeSet);

    context.fromTokens = include.length > 0 ? include : undefined;
    context.excludeFromTokens = exclude.length > 0 ? exclude : undefined;

    if (returnMode === 'back') {
      await tick();
      popupControls.back();
      return;
    }

    popToOrOpen(AmountStep, {
      title: SEND_POPUP_TITLE,
      props: { context },
    });
  }

</script>

<FlowStepScaffold
  {...SEND_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Token filters"
  subtitle="Choose which source tokens are allowed in auto routing."
>
  <div class="space-y-3">
    <input
      type="text"
      class="input input-bordered input-sm w-full"
      placeholder="Search by token or owner address"
      bind:value={query}
      data-send-step-initial-focus
    />

    <div class="flex items-center justify-between text-xs text-base-content/70">
      <span>Included: {includeSet.size} · Excluded: {excludeSet.size}</span>
      <div class="join">
        <button type="button" class="btn btn-ghost btn-xs join-item" onclick={includeAll}>Include all</button>
        <button type="button" class="btn btn-ghost btn-xs join-item" onclick={excludeAll}>Exclude all</button>
      </div>
    </div>

    <div class="max-h-72 overflow-y-auto border border-base-300 rounded-lg divide-y divide-base-300">
      {#if tokenOptions.length === 0}
        <div class="p-3 text-sm text-base-content/70">No matching tokens found.</div>
      {:else}
        {#each tokenOptions as item (String(item.tokenAddress))}
          {@const tokenAddress = String(item.tokenAddress ?? '')}
          {@const key = tokenAddress.toLowerCase()}
          <div class="p-3 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <Avatar address={item.tokenOwner} clickable={true} view="horizontal" />
              <div class="text-xs text-base-content/65 break-all mt-1">{tokenAddress}</div>
            </div>
            <div class="join">
              <button
                type="button"
                class="btn btn-xs join-item"
                class:btn-success={includeSet.has(key)}
                class:btn-ghost={!includeSet.has(key)}
                onclick={() => setInclude(tokenAddress)}
              >
                Include
              </button>
              <button
                type="button"
                class="btn btn-xs join-item"
                class:btn-warning={excludeSet.has(key)}
                class:btn-ghost={!excludeSet.has(key)}
                onclick={() => setExclude(tokenAddress)}
              >
                Exclude
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="mt-4 flex justify-end">
      <button type="button" class="btn btn-primary btn-sm" onclick={applyFilters}>Apply</button>
    </div>
  </div>
</FlowStepScaffold>