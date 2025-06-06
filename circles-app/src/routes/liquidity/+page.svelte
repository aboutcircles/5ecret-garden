<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import LBP_STARTER_ABI from '$lib/utils/abi/LBP_STARTER';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { ethers } from 'ethers';
  import type { ContractRunner, EventLog } from 'ethers';
  import AddLiquidity from '$lib/components/AddLiquidity.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/stores/popUp';
  import { formatEther } from 'viem';
  import LBP_STARTER_INSTANCE_ABI from '$lib/utils/abi/LBP_STARTER_INSTANCE';
  import { shortenAddress } from '$lib/utils/shared';
  import type { LBPStarterInstance } from '../../types/LbpStarter';
  const LBP_STARTER_ADDRESS = '0x3b36d73506c3e75fcacb27340faa38ade1cbaf0a';

  let lbpStarterContract: ethers.Contract | null = $state(null);
  let filter: ethers.DeferredTopicFilter | null = $state(null);
  let lbpStarterCreated: LBPStarterInstance[] = $state([]);
  async function fetchLbpStarterCreatedEvents() {
    const fromBlock = 0;
    const toBlock = 'latest';

    if (!filter) {
      return [];
    }

    const events = await lbpStarterContract?.queryFilter(
      filter,
      fromBlock,
      toBlock
    );
    if (!events) {
      return [];
    }
    lbpStarterCreated = await Promise.all(
      events.map(async (event) => {
        const eventLog = event as EventLog;
        const contractAddress = eventLog.args[3];
        const LBPContract = new ethers.Contract(
          contractAddress,
          LBP_STARTER_INSTANCE_ABI,
          $wallet as ContractRunner
        );
        const groupAmountInit = eventLog.args[4];
        const assetAmountInit = eventLog.args[5];
        const groupAmountCurrent = await LBPContract.balanceGroup();
        const assetAmountCurrent = await LBPContract.balanceAsset();
        const lbpAddress = await LBPContract.groupLBP();
        const status =
          lbpAddress === '0x0000000000000000000000000000000000000000'
            ? groupAmountCurrent >= groupAmountInit &&
              assetAmountCurrent >= assetAmountInit
              ? 'Ready'
              : 'In progress'
            : 'Active';
        return {
          creator: eventLog.args[0],
          group: eventLog.args[1],
          asset: eventLog.args[2],
          contract: contractAddress,
          groupAmountInit: formatEther(groupAmountInit),
          groupAmountCurrent: formatEther(groupAmountCurrent),
          assetAmountInit: formatEther(assetAmountInit),
          assetAmountCurrent: formatEther(assetAmountCurrent),
          groupInitWeight: eventLog.args[6],
          groupFinalWeight: eventLog.args[7],
          swapFee: eventLog.args[8],
          updateWeightDuration: eventLog.args[9],
          lbpAddress,
          status,
        };
      })
    );
  }

  $effect(() => {
    const tokenId = avatarState.avatar?.avatarInfo?.tokenId;
    if ($wallet && tokenId && !lbpStarterContract) {
      const contract = new ethers.Contract(
        LBP_STARTER_ADDRESS,
        LBP_STARTER_ABI,
        $wallet as ContractRunner
      );

      const topicFilter = contract.filters.LBPStarterCreated(
        null,
        tokenId,
        null,
        null
      );
      lbpStarterContract = contract;
      filter = topicFilter;
    }
  });

  $effect(() => {
    if (lbpStarterContract && filter) {
      fetchLbpStarterCreatedEvents();
    }
  });
</script>

<div class="flex flex-col items-center w-full max-w-4xl gap-y-6 mt-20">
  <h1 class="text-2xl font-bold mb-2">LBP Starter</h1>
  <p class="text-gray-600 mb-6">
    Create and manage Liquidity Bootstrapping Pools
  </p>
  <div class="flex flex-col items-center w-full">
    <div class="flex justify-between w-full">
      <p>LBPs created for this group</p>
      <button
        disabled={!lbpStarterContract}
        class="btn btn-sm btn-primary"
        onclick={() => {
          popupControls.open?.({
            title: 'Create LBP Starter',
            component: AddLiquidity,
            props: { lbpStarterContract },
          });
        }}>Create LBP Starter</button
      >
    </div>
    <table class="table mt-4">
      <!-- head -->
      <thead>
        <tr>
          <th></th>
          <th>Address</th>
          <th>Status</th>
          <th>Group Balance</th>
          <th>Asset Balance</th>
        </tr>
      </thead>
      <tbody>
        {#each lbpStarterCreated as lbp}
          <tr>
            <th></th>
            <td
              ><a
                href={`https://gnosisscan.io/address/${lbp.contract}`}
                target="_blank">{shortenAddress(lbp.contract)}</a
              ></td
            >
            <td
              ><div class="inline-grid *:[grid-area:1/1] mr-1">
                {#if lbp.status === 'Ready'}
                  <span class="status status-success animate-ping"></span>
                {/if}
                <span
                  class="status {lbp.status === 'Ready' ||
                  lbp.status === 'Active'
                    ? 'status-success'
                    : 'status-secondary'}"
                ></span>
              </div>
              {lbp.status}</td
            >
            <td>{lbp.groupAmountCurrent} / {lbp.groupAmountInit}</td>
            <td>{lbp.assetAmountCurrent} / {lbp.assetAmountInit}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
