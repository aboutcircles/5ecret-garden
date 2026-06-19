<script lang="ts">
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { isHumanAvatar } from '$lib/shared/utils/avatarHelpers';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { EoaBrowserRunner } from '$lib/shared/integrations/wallet/EoaBrowserRunner';
  import {
    getScoreGroup,
    isScoreGroupConfigured,
  } from '$lib/shared/integrations/permissionlessGroups/scoreGroup';
  import { executeTxConfirmFirst } from '$lib/shared/utils/txExecution';
  import {
    sendRunnerBatchAndWait,
    isBenignReceiptDecodeError,
  } from '$lib/shared/utils/tx';
  import { refreshTransactionHistory } from '$lib/shared/state/transactionHistory';
  import { refreshBalanceStore } from '$lib/shared/state/circlesBalances';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import type { Address } from '@aboutcircles/sdk-types';

  /**
   * Dashboard banner that offers to migrate a holder's legacy group CRC into the
   * current score group. Renders nothing unless there's a non-dust migratable
   * amount. Migration is routed by the pathfinder into the score group's sink
   * wrapper and submitted as one atomic batch (Safe wallets only), kept separate
   * from the mint batch so the two flow matrices never contend on the same state.
   */

  let migratable = $state<bigint>(0n);
  let checked = $state(false);
  let isMigrating = $state(false);
  let done = $state(false);

  const runner = $derived($wallet);
  const isEoa = $derived(runner instanceof EoaBrowserRunner);
  const fmt = (atto: bigint): number =>
    roundToDecimals(parseFloat(ethers.formatEther(atto)));

  // Display rounds to 2 decimals, so a dust amount (e.g. 0.004 CRC) is > 0n yet renders
  // as "0 CRC". Gate the banner on the ROUNDED value so it only appears when there is a
  // real, non-dust amount to migrate — never a confusing "migrate 0 CRC" prompt.
  const migratableCrc = $derived(fmt(migratable));

  onMount(() => {
    void check();
  });

  async function check() {
    try {
      const avatar = avatarState.avatar;
      if (!avatar || !isHumanAvatar(avatar) || !isScoreGroupConfigured())
        return;
      const group = getScoreGroup();
      if (!group) return;
      migratable = await group.migratableAmount({
        avatar: avatar.address as Address,
      });
    } catch (error) {
      // No path / pathfinder hiccup — treat as "nothing to migrate", stay hidden.
      console.warn('[scoreGroup] migratable check failed', error);
    } finally {
      checked = true;
    }
  }

  async function migrate() {
    const avatar = avatarState.avatar;
    if (
      !avatar ||
      !isHumanAvatar(avatar) ||
      migratable <= 0n ||
      isEoa ||
      isMigrating
    )
      return;
    const group = getScoreGroup();
    if (!group || !runner) return;

    isMigrating = true;
    try {
      const result = await group.migration({
        avatar: avatar.address as Address,
      });
      if (result.txs.length === 0 || result.amount === 0n) {
        migratable = 0n;
        return;
      }
      await executeTxConfirmFirst({
        name: `Migrating ${fmt(result.amount)} group CRC …`,
        submit: () =>
          sendRunnerBatchAndWait(runner, result.txs, {
            label: 'Group migration',
          }),
        onSuccess: async () => {
          done = true;
          migratable = 0n;
          refreshBalanceStore(avatar);
          refreshTransactionHistory();
        },
      });
    } catch (error) {
      if (!isBenignReceiptDecodeError(error)) throw error;
      done = true;
      migratable = 0n;
      refreshBalanceStore(avatar);
      refreshTransactionHistory();
    } finally {
      isMigrating = false;
    }
  }
</script>

{#if checked && migratableCrc >= 0.01 && !done}
  <div
    style="
      display:flex;align-items:center;gap:14px;flex-wrap:wrap;
      padding:14px 16px;border-radius:14px;margin-bottom:20px;
      background:{T.butterSoft};border:1px solid rgba(244,210,122,0.5);
    "
  >
    <Icon name="sparkle" size={16} stroke="#7B5215" strokeWidth={2} />
    <div style="flex:1;min-width:200px;">
      <div style="font-size:13px;font-weight:620;color:#7B5215;">
        Migrate legacy group Circles
      </div>
      <div style="font-size:12px;color:{T.inkBody};line-height:1.45;">
        You can migrate {fmt(migratable)} CRC into the current group.
      </div>
    </div>

    {#if isEoa}
      <span style="font-size:11.5px;color:{T.inkMuted};"
        >Requires a Safe wallet</span
      >
    {:else}
      <button
        type="button"
        onclick={migrate}
        disabled={isMigrating}
        style="
          height:40px;padding:0 18px;border-radius:9999px;border:0;cursor:pointer;
          background:{T.primary};color:#fff;
          font-family:{T.fontSans};font-size:13.5px;font-weight:560;
          opacity:{isMigrating ? 0.6 : 1};
        "
      >
        {isMigrating ? 'Migrating…' : 'Migrate'}
      </button>
    {/if}
  </div>
{/if}
