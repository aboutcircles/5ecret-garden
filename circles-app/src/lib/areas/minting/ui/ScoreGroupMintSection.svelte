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
   * Optional add-on inside the Mint popup: mint *group* CRC collateralized by the
   * user's own personal CRC, split by their reputation score. This does not
   * replace the plain personal mint — it's an extra path that, alongside minting
   * the full personal issuance, converts `score%` of it into group CRC. The
   * remaining `(100 - score)%` stays as personal CRC. There is no on-chain
   * reverse (group CRC is backed but not redeemable), so this is presented as an
   * opt-in choice, never the default.
   */

  interface Props {
    /** Fires after a successful reputation mint so the parent can refresh. */
    onMinted?: () => void;
  }

  let { onMinted }: Props = $props();

  /** Policy score scale: anything at/above 100 mints the full issuance. */
  const MAX_SCORE = 100n;

  let loading = $state(true);
  let unavailable = $state(false);
  let score = $state<bigint | null>(null);
  let issuance = $state<bigint | null>(null);
  let isMinting = $state(false);
  let done = $state(false);

  const runner = $derived($wallet);
  // The mint batch (snapshot → personalMint → groupMint → wrap) only holds its
  // on-chain invariant when executed atomically. Safe runners multisend; EOA
  // runners send sequentially and would revert mid-batch, so it's disabled for them.
  const isEoa = $derived(runner instanceof EoaBrowserRunner);

  const clampedScore = $derived(
    score === null ? 0n : score > MAX_SCORE ? MAX_SCORE : score
  );
  const gcrcAtto = $derived(
    issuance === null ? 0n : (issuance * clampedScore) / MAX_SCORE
  );
  const pcrcAtto = $derived(issuance === null ? 0n : issuance - gcrcAtto);
  const eligible = $derived((score ?? 0n) > 0n && (issuance ?? 0n) > 0n);

  const fmt = (atto: bigint): number =>
    roundToDecimals(parseFloat(ethers.formatEther(atto)));

  onMount(() => {
    void load();
  });

  async function load() {
    loading = true;
    unavailable = false;
    try {
      const avatar = avatarState.avatar;
      if (!avatar || !isHumanAvatar(avatar) || !isScoreGroupConfigured()) {
        unavailable = true;
        return;
      }
      const group = getScoreGroup();
      if (!group) {
        unavailable = true;
        return;
      }
      const addr = avatar.address as Address;
      const [scoreResult, issuanceResult] = await Promise.all([
        group.getScore(addr),
        group.hub.calculateIssuance(addr),
      ]);
      score = scoreResult;
      // calculateIssuance returns [issuance, startPeriod, endPeriod]; we only
      // need the claimable issuance, the same value the policy snapshots.
      issuance = issuanceResult[0];
    } catch (error) {
      // Backend/RPC hiccup — hide the option rather than blocking the plain
      // personal mint that lives above this section.
      console.warn('[scoreGroup] failed to load reputation/issuance', error);
      unavailable = true;
    } finally {
      loading = false;
    }
  }

  async function mintSplit() {
    const avatar = avatarState.avatar;
    if (!avatar || !isHumanAvatar(avatar) || !eligible || isEoa || isMinting)
      return;
    const group = getScoreGroup();
    if (!group || !runner) return;

    isMinting = true;
    try {
      // Re-fetch a fresh proof + amount at submit time (the displayed split is a
      // preview; the policy verifies against the current on-chain root).
      const result = await group.mint({ avatar: avatar.address as Address });
      if (result.txs.length === 0 || result.amount === 0n) {
        unavailable = true;
        return;
      }

      await executeTxConfirmFirst({
        name: `Minting ${fmt(result.amount)} group CRC …`,
        submit: () =>
          sendRunnerBatchAndWait(runner, result.txs, {
            label: 'Reputation mint',
          }),
        onSuccess: async () => {
          done = true;
          refreshBalanceStore(avatar);
          refreshTransactionHistory();
          onMinted?.();
        },
      });
    } catch (error) {
      if (!isBenignReceiptDecodeError(error)) throw error;
      done = true;
      refreshBalanceStore(avatar);
      refreshTransactionHistory();
      onMinted?.();
    } finally {
      isMinting = false;
    }
  }
</script>

{#if !unavailable && !loading && eligible}
  <div
    style="
      display:flex;flex-direction:column;gap:12px;
      padding:16px;border-radius:16px;
      background:{T.surface};border:1px solid {T.hairlineSoft};
    "
  >
    <div style="display:flex;align-items:center;gap:10px;">
      <Icon name="sparkle" size={15} stroke={T.primary} strokeWidth={2} />
      <span style="font-size:13px;font-weight:620;color:{T.ink};"
        >Mint with reputation</span
      >
      <span
        style="
          margin-left:auto;padding:3px 10px;border-radius:9999px;
          background:{T.butterSoft};color:#7B5215;
          font-family:{T.fontMono};font-size:11px;font-weight:600;
        ">Score {clampedScore}/100</span
      >
    </div>

    {#if done}
      <div
        style="display:flex;align-items:center;gap:8px;color:{T.inkBody};font-size:12.5px;"
      >
        <Icon name="check" size={14} stroke={T.primary} />
        Reputation mint submitted.
      </div>
    {:else}
      <p style="margin:0;font-size:12.5px;color:{T.inkMuted};line-height:1.5;">
        Convert {clampedScore}% of your minted Circles into group CRC, backed by
        your personal CRC.
      </p>

      <div style="display:flex;gap:10px;">
        <div
          style="flex:1;padding:10px 12px;border-radius:12px;background:{T.pageDeep};"
        >
          <div
            style="font-size:10.5px;color:{T.inkMuted};text-transform:uppercase;letter-spacing:0.04em;"
          >
            Group CRC
          </div>
          <div
            style="font-family:{T.fontMono};font-size:16px;color:{T.ink};font-weight:600;"
          >
            {fmt(gcrcAtto)}
          </div>
        </div>
        <div
          style="flex:1;padding:10px 12px;border-radius:12px;background:{T.pageDeep};"
        >
          <div
            style="font-size:10.5px;color:{T.inkMuted};text-transform:uppercase;letter-spacing:0.04em;"
          >
            Personal CRC
          </div>
          <div
            style="font-family:{T.fontMono};font-size:16px;color:{T.ink};font-weight:600;"
          >
            {fmt(pcrcAtto)}
          </div>
        </div>
      </div>

      {#if isEoa}
        <div style="font-size:11.5px;color:{T.inkMuted};line-height:1.45;">
          Reputation minting requires a Safe wallet (the steps must run in one
          transaction).
        </div>
      {/if}

      <button
        type="button"
        onclick={mintSplit}
        disabled={isMinting || isEoa}
        style="
          width:100%;height:48px;border-radius:9999px;border:1px solid {T.primary};cursor:pointer;
          background:transparent;color:{T.primary};
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
          font-family:{T.fontSans};font-size:14.5px;font-weight:560;
          opacity:{isMinting || isEoa ? 0.55 : 1};
        "
      >
        {#if isMinting}
          Minting…
        {:else}
          <Icon name="sparkle" size={15} stroke={T.primary} strokeWidth={2} />
          Mint {fmt(gcrcAtto)} group CRC
        {/if}
      </button>
    {/if}
  </div>
{/if}
