<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import TransactionRow from './TransactionRow.svelte';
  import TotalBalance from '$lib/components/TotalBalance.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '$lib/utils/tasks';
  import { transactionHistory } from '$lib/stores/transactionHistory';
  import { circles } from '$lib/stores/circles';
  import { uint256ToAddress, type Address } from '@circles-sdk/utils';
  import { getVaultAddress, getVaultBalances } from '$lib/utils/vault';
  import type { Sdk } from '@circles-sdk/sdk';
  import GroupMetrics from '$lib/components/GroupMetrics.svelte';
  import { getMemberCountPerDay, getMemberCountPerHour } from '$lib/stores/groupMetrics.svelte';
  import Chart from '$lib/components/Chart.svelte';

  let mintableAmount: number = $state(0);

  let collateralInTreasury: Array<{
    avatar: Address;
    amount: bigint;
  }> = $state([]);

  let memberCountPerHour: { timestamp: Date; count: number }[] = $state([]);
  let memberCountPerDay: { timestamp: Date; count: number }[] = $state([]);

  $effect(() => {
    (async () => {
      if (avatarState.avatar && !avatarState.isGroup) {
        mintableAmount = (await avatarState.avatar.getMintableAmount()) ?? 0;
      }

      if (avatarState.isGroup && $circles && avatarState.avatar) {
        await initializeGroupMetrics($circles, avatarState.avatar.address);
      }
    })();
  });

  async function initializeGroupMetrics(circles: Sdk, group: Address) {
    const vaultAddress = await getVaultAddress(circles.circlesRpc, group);
    if (!vaultAddress) {
      collateralInTreasury = [];
      return;
    }

    const balancesResult = await getVaultBalances(
      circles.circlesRpc,
      vaultAddress
    );
    if (!balancesResult) {
      collateralInTreasury = [];
      return;
    }

    const { columns, rows } = balancesResult;
    const colId = columns.indexOf('id');
    const colBal = columns.indexOf('balance');

    collateralInTreasury = rows.map((row) => ({
      avatar: uint256ToAddress(BigInt(row[colId])),
      amount: BigInt(row[colBal]),
    }));

    memberCountPerHour = await getMemberCountPerHour(
      circles.circlesRpc,
      group
    );

    memberCountPerDay = await getMemberCountPerDay(
      circles.circlesRpc,
      group
    );
  }

  async function mintPersonalCircles() {
    if (!avatarState.avatar) {
      throw new Error('Avatar store is not available');
    }

    runTask({
      name: 'Minting Circles ...',
      promise: avatarState.avatar.personalMint(),
    }).finally(async () => {
      mintableAmount = (await avatarState.avatar?.getMintableAmount()) ?? 0;
    });

    mintableAmount = 0;
  }
</script>

<div class="flex flex-col items-center w-full max-w-2xl gap-y-6 mt-20">
  <TotalBalance />

  {#if mintableAmount >= 0.01}
    <button class="btn btn-sm btn-primary" onclick={mintPersonalCircles}>
      Mint {roundToDecimals(mintableAmount)} Circles
    </button>
  {/if}
  <div role="tablist" class="tabs tabs-bordered w-full p-0 my-10">
    {#if avatarState.isGroup}
      <input
        type="radio"
        name="tabs"
        value="overview"
        role="tab"
        class="tab h-auto"
        checked
        aria-label="Overview"
      />
      <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
        <GroupMetrics {collateralInTreasury} {memberCountPerHour} {memberCountPerDay} />
        <Chart {memberCountPerDay} {memberCountPerHour} />
      </div>
    {/if}
    <input
      type="radio"
      name="tabs"
      value="transaction-history"
      role="tab"
      class="tab h-auto"
      checked
      aria-label="Transaction History"
    />
    <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
      <div class="w-full md:border rounded-lg md:px-4">
        <GenericList row={TransactionRow} store={transactionHistory} />
      </div>
    </div>
  </div>
</div>
