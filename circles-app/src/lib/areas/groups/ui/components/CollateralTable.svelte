<script lang="ts">
  import { formatUnits, parseEther } from 'ethers';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { Address, TrustRelationType } from '@aboutcircles/sdk-types';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import ProfilePage from '$lib/areas/profile/ui/pages/Profile.svelte';

  function formatEtherTwoDecimals(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
  }

  interface Props {
    collateralInTreasury: Array<{
      avatar: Address;
      amount: bigint; // raw wei from chain
      amountToRedeem: bigint;
      amountToRedeemInCircles: number;
      trustRelation?: TrustRelationType;
    }>;
    redeemable?: boolean;
  }

  let { collateralInTreasury, redeemable = false }: Props = $props();

  function onRedeemInput(
    item: {
      avatar: Address;
      amount: bigint;
      amountToRedeem: bigint;
      amountToRedeemInCircles: number;
      trustRelation?: TrustRelationType;
    },
    e: Event
  ) {
    const input = e.target as HTMLInputElement | null;
    const newValue = parseFloat(input?.value ?? '0');
    const safeValue = isNaN(newValue) ? 0 : newValue;
    item.amountToRedeemInCircles = safeValue;
    item.amountToRedeem = parseEther(safeValue.toString());
  }

  function openProfile(addr: Address): void {
    popupControls.open({
      title: '',
      component: ProfilePage,
      props: { address: addr },
    });
  }
</script>

<div class="w-full">
  {#each collateralInTreasury as item}
    <RowFrame
      clickable={true}
      dense={true}
      noLeading={true}
      on:click={() => openProfile(item.avatar)}
    >
      <div class="min-w-0">
        <Avatar address={item.avatar} clickable={true} view="horizontal" />
      </div>

      <div slot="trailing" class="flex items-center gap-3 md:gap-4">
        <div class="text-right tabular-nums">
          <div class="font-medium">
            {formatEtherTwoDecimals(item.amount)} CRC
          </div>
        </div>

        {#if redeemable}
          <input
            type="number"
            class="input input-bordered w-36"
            value={item.amountToRedeemInCircles}
            oninput={(e) => onRedeemInput(item, e)}
            min="0"
          />
        {/if}
      </div>
    </RowFrame>
  {/each}
</div>
