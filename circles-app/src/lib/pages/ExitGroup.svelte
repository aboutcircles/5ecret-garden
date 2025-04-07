<script lang="ts">
  import { run } from 'svelte/legacy';

  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { type Address, uint256ToAddress } from '@circles-sdk/utils';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { onMount } from 'svelte';
  import { formatUnits, parseUnits } from 'ethers';
  import type { TokenBalanceRow, TrustRelation } from '@circles-sdk/data';
  import { contacts } from '$lib/stores/contacts';
  import { formatTrustRelation } from '$lib/utils/helpers';

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

    // 1) Query the vault address from your table
    const vaultResult = await $circles.circlesRpc.call<{
      columns: string[];
      rows: any[][];
    }>('circles_query', [
      {
        Namespace: 'CrcV2',
        Table: 'CreateVault',
        Columns: ['vault'],
        Filter: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'group',
            Value: asset.tokenOwner.toLowerCase(),
          },
        ],
        Order: [],
      },
    ]);

    if (!vaultResult?.result.rows || vaultResult.result.rows.length === 0) {
      collateralInTreasury = [];
      return;
    }

    const vaultAddress = vaultResult.result.rows[0][0];

    // 2) Use that vault to fetch balances
    const balancesResult = await $circles.circlesRpc.call<{
      columns: string[];
      rows: any[][];
    }>('circles_query', [
      {
        Namespace: 'V_CrcV2',
        Table: 'GroupVaultBalancesByToken',
        Columns: ['id', 'balance'],
        Filter: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'vault',
            Value: vaultAddress.toLowerCase(),
          },
        ],
        Order: [],
      },
    ]);

    if (
      !balancesResult?.result.rows ||
      balancesResult.result.rows.length === 0
    ) {
      collateralInTreasury = [];
      return;
    }

    const { columns, rows } = balancesResult.result;
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

    if(item) {
      item.trustRelation = 'selfTrusts';
    }
  }

  function formatEtherTwoDecimals(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
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

  <div class="gap-x-2">
    <ActionButton action={async () => {}}>Distribute</ActionButton>
    <ActionButton action={resetFields} disabled={!isModified}>
      Reset
    </ActionButton>
  </div>
</div>

<table class="table table-zebra w-full">
  <thead>
    <tr>
      <th>Collateral</th>
      <th>Available amount</th>
      <th>Amount to redeem</th>
    </tr>
  </thead>
  <tbody>
    {#each collateralInTreasury as item}
      <tr>
        <td>
          <Avatar
            address={item.avatar}
            clickable={false}
            view="horizontal"
            bottomInfo={formatTrustRelation(item.trustRelation)}
          />
        </td>
        <td>
          {formatEtherTwoDecimals(item.amount)}
        </td>
        <td>
          <input
            type="number"
            class="input input-bordered w-36"
            bind:value={item.amountToRedeem}
            min="0"
          />
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<div class="mt-4 flex justify-end">
  <ActionButton action={redeem} disabled={!canRedeem}>Redeem</ActionButton>
</div>
