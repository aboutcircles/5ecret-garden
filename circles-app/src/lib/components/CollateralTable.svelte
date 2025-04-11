<script lang="ts">
  import { formatTrustRelation } from '$lib/utils/helpers';
  import { formatUnits } from 'ethers';
  import Avatar from './avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import type { TrustRelation } from '@circles-sdk/data';

  function formatEtherTwoDecimals(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
  }

  interface Props {
    collateralInTreasury: Array<{
      avatar: Address;
      amount: bigint; // raw wei from chain
      amountToRedeem: number;
      trustRelation?: TrustRelation;
    }>;
    redeemable?: boolean;
  }

  let { collateralInTreasury, redeemable = false }: Props = $props();
</script>

<table class="table table-zebra w-full">
  <thead>
    <tr>
      <th>Collateral</th>
      <th>Available amount</th>
      {#if redeemable}<th>Amount to redeem</th>{/if}
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
        {#if redeemable}
          <td>
            <input
              type="number"
              class="input input-bordered w-36"
              value={item.amountToRedeem.toFixed(2)}
              oninput={(e) => {
                const newValue = parseFloat(
                  (e.target as HTMLInputElement)?.value
                );
                item.amountToRedeem = isNaN(newValue) ? 0 : newValue;
              }}
              min="0"
            />
          </td>
        {/if}
      </tr>
    {/each}
  </tbody>
</table>
