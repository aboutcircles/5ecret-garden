<script lang="ts">
  import { run } from 'svelte/legacy';

  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { type Address, uint256ToAddress } from '@circles-sdk/utils';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { onMount } from 'svelte';
  import { formatUnits, parseUnits } from 'ethers';
  import type { TokenBalanceRow, TrustRelation } from '@circles-sdk/data';
  import { contacts } from '$lib/stores/contacts';
  import { getVaultAddress, getVaultBalances } from '$lib/utils/vault';
  import CollateralTable from '$lib/components/CollateralTable.svelte';

  interface Props {
    asset: TokenBalanceRow;
  }

  let { asset }: Props = $props();

  let collateralInTreasury: Array<{
    avatar: Address;
    amount: bigint; // raw wei from chain
    amountToRedeem: number;
    trustRelation?: TrustRelation;
  }> = $state([]);

  // We'll keep track of the total to redeem and whether it's valid.
  let totalToRedeem = $state(0);
  let remainingToAllocate = $state(0);
  let canRedeem = $state(false);
  let isModified = $state(false);

  const trustPriorityMap: {
    [K in TrustRelation]: number;
  } = {
    selfTrusts: 1,
    mutuallyTrusts: 2,
    trusts: 3,
    trustedBy: 4,
    variesByVersion: 5,
  };

  function getTrustPriority(item: { trustRelation?: TrustRelation }): number {
    return item.trustRelation && trustPriorityMap[item.trustRelation]
      ? trustPriorityMap[item.trustRelation]
      : 6;
  }

  // This runs whenever collateralInTreasury changes or user input changes.
  // It re-calculates the sums and validity for the UI.
  run(() => {
    // 1) Convert the user's total redeemable (asset.circles) from wei to a floating number.
    //    If asset.circles is already a string or BigInt, adapt accordingly.
    //    Example assumes it's a BigInt or numeric string in wei:
    const userMaxRedeem = asset.circles;

    // 2) Sum the amounts the user wants to redeem.
    totalToRedeem = collateralInTreasury.reduce(
      (acc, item) => acc + (item.amountToRedeem || 0),
      0
    );

    // 3) Check that no user input exceeds its available collateral,
    //    and that totalToRedeem doesn't exceed the user’s own max.
    const allWithinCollateral = collateralInTreasury.every((item) => {
      const maxForThisToken = Number(formatUnits(item.amount.toString(), 18));
      return item.amountToRedeem >= 0 && item.amountToRedeem <= maxForThisToken;
    });

    const withinUserBalance =
      totalToRedeem <= userMaxRedeem && totalToRedeem >= 0;

    // 4) The user can still allocate up to this many tokens
    remainingToAllocate = userMaxRedeem - totalToRedeem;

    // 5) Only enable redeem if everything checks out
    canRedeem = allWithinCollateral && withinUserBalance && totalToRedeem > 0;

    // If any item.amountToRedeem != 0, this is “modified”
    isModified = collateralInTreasury.some((item) => item.amountToRedeem !== 0);
  });

  onMount(async () => {
    if (!$circles) return;
    await load();
  });

  async function load() {
    if (!$circles) return;

    const vaultAddress = await getVaultAddress(
      $circles.circlesRpc,
      asset.tokenOwner
    );
    if (!vaultAddress) {
      collateralInTreasury = [];
      return;
    }

    const balancesResult = await getVaultBalances(
      $circles.circlesRpc,
      vaultAddress
    );
    if (!balancesResult) {
      collateralInTreasury = [];
      return;
    }

    const { columns, rows } = balancesResult;
    const colId = columns.indexOf('id');
    const colBal = columns.indexOf('balance');

    // Build up the table data
    collateralInTreasury = rows.map((row) => ({
      avatar: uint256ToAddress(BigInt(row[colId])),
      amount: BigInt(row[colBal]),
      amountToRedeem: 0, // default 0
    }));

    Object.entries($contacts.data).map(([_, contact]) => {
      const address = contact.avatarInfo?.avatar;
      const relation = contact.row.relation;

      const item = collateralInTreasury.find((item) => item.avatar === address);

      if (item) {
        item.trustRelation = relation;
      }
    });

    const item = collateralInTreasury.find(
      (item) => item.avatar === $avatar?.address
    );

    if (item) {
      item.trustRelation = 'selfTrusts';
    }
  }

  async function redeem() {
    if (!$avatar) return;

    // Build the arrays:
    //   1) All collateral addresses
    //   2) Corresponding amounts in wei
    const collateralAddresses: Address[] = [];
    const redeemAmounts: bigint[] = [];

    for (const item of collateralInTreasury) {
      if (item.amountToRedeem > 0) {
        collateralAddresses.push(item.avatar);
        // Convert user input from Ether to wei
        redeemAmounts.push(parseUnits(item.amountToRedeem.toString(), 18));
      }
    }

    console.log(`Redeeming ${redeemAmounts.length} tokens:`, redeemAmounts);
    console.log(
      `Redeeming ${collateralAddresses.length} addresses:`,
      collateralAddresses
    );

    // Now call groupRedeem with those arrays
    await $avatar.groupRedeem(
      asset.tokenOwner,
      collateralAddresses,
      redeemAmounts
    );
  }

  async function resetFields() {
    collateralInTreasury = collateralInTreasury.map((item) => ({
      ...item,
      amountToRedeem: 0,
    }));
  }

  function distribute() {
    const sortedCollateral = collateralInTreasury
      .slice()
      .sort((a, b) => getTrustPriority(a) - getTrustPriority(b));

    for (const item of sortedCollateral) {
      if (item.amountToRedeem > 0) {
        continue;
      }
      if (remainingToAllocate <= 0) break;

      const available = Number(formatUnits(item.amount.toString(), 18));

      if (available > 0) {
        const allocation = Math.min(available, remainingToAllocate);
        item.amountToRedeem = allocation;
        remainingToAllocate -= allocation;
      }
    }
  }
</script>

<p>
  <strong>Total redeemable balance:</strong>
  {#if asset?.circles}
    {#if +asset.circles > 0}
      {asset.circles.toFixed(2)}
    {:else}
      0
    {/if}
  {:else}
    0
  {/if}
</p>

<div class="flex justify-between items-center my-2">
  <p>
    You can still allocate:
    {#if remainingToAllocate >= 0}
      {remainingToAllocate.toFixed(2)}
    {:else}
      0
    {/if}
  </p>

  <div class="flex gap-x-2">
    <button class="text-primary font-semibold" onclick={distribute}
      >Distribute</button
    >
    <ActionButton action={resetFields} disabled={!isModified}>
      Reset
    </ActionButton>
  </div>
</div>

<CollateralTable {collateralInTreasury} redeemable={true} />

<div class="mt-4 flex justify-end">
  <ActionButton action={redeem} disabled={!canRedeem}>Redeem</ActionButton>
</div>
