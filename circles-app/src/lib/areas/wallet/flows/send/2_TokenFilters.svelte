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
  import { T } from '$lib/design-system/tokens.js';

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
  <div style="display:flex;flex-direction:column;gap:10px;">
    <!-- Search input -->
    <input
      type="text"
      style="
        width:100%;padding:10px 14px;border:1px solid {T.hairline};border-radius:10px;
        font-family:{T.fontSans};font-size:13px;color:{T.ink};background:{T.surface};
        box-sizing:border-box;
      "
      placeholder="Search by token or owner address"
      bind:value={query}
      data-send-step-initial-focus
    />

    <!-- Stats + bulk actions -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;">
      <span style="font-size:11.5px;color:{T.inkMuted};">
        Included: <strong style="color:{T.positive};">{includeSet.size}</strong>
        · Excluded: <strong style="color:{T.warning};">{excludeSet.size}</strong>
      </span>
      <div style="display:flex;gap:4px;">
        <button
          type="button"
          style="height:26px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
          onclick={includeAll}
        >Include all</button>
        <button
          type="button"
          style="height:26px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
          onclick={excludeAll}
        >Exclude all</button>
      </div>
    </div>

    <!-- Token list -->
    <div style="max-height:288px;overflow-y:auto;border:1px solid {T.hairlineSoft};border-radius:14px;background:{T.surface};">
      {#if tokenOptions.length === 0}
        <div style="padding:16px 14px;font-size:12.5px;color:{T.inkMuted};">No matching tokens found.</div>
      {:else}
        {#each tokenOptions as item, i (String(item.tokenAddress))}
          {@const tokenAddress = String(item.tokenAddress ?? '')}
          {@const key = tokenAddress.toLowerCase()}
          {@const isIncluded = includeSet.has(key)}
          {@const isExcluded = excludeSet.has(key)}
          <div style="
            padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;
            {i > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}
          ">
            <div style="min-width:0;flex:1;">
              <Avatar address={item.tokenOwner} clickable={true} view="horizontal" />
              <div style="font-family:{T.fontMono};font-size:10px;color:{T.inkFaint};word-break:break-all;margin-top:2px;line-height:1.3;">{tokenAddress.slice(0,20)}…</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button
                type="button"
                style="
                  height:26px;padding:0 10px;border-radius:9999px;font-size:11px;font-weight:540;cursor:pointer;
                  border:1px solid {isIncluded ? T.positive : T.hairline};
                  background:{isIncluded ? T.positiveSoft : T.surface};
                  color:{isIncluded ? T.positive : T.inkMuted};
                "
                onclick={() => setInclude(tokenAddress)}
              >Include</button>
              <button
                type="button"
                style="
                  height:26px;padding:0 10px;border-radius:9999px;font-size:11px;font-weight:540;cursor:pointer;
                  border:1px solid {isExcluded ? T.warning : T.hairline};
                  background:{isExcluded ? T.warningSoft : T.surface};
                  color:{isExcluded ? T.warning : T.inkMuted};
                "
                onclick={() => setExclude(tokenAddress)}
              >Exclude</button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div style="display:flex;justify-content:flex-end;">
      <button
        type="button"
        style="
          height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:pointer;
          background:{T.primary};color:#fff;
          font-family:{T.fontSans};font-size:14px;font-weight:580;
          box-shadow:0 4px 12px rgba(88,73,212,0.25);
        "
        onclick={applyFilters}
      >Apply filters</button>
    </div>
  </div>
</FlowStepScaffold>