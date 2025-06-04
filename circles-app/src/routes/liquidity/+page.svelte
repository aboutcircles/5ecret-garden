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

  const LBP_STARTER_ADDRESS = '0x3b36d73506c3e75fcacb27340faa38ade1cbaf0a';

  interface LBPStarterCreated {
    creator: Address;
    group: Address;
    asset: Address;
    contract: Address;
    groupAmountInit: bigint;
    groupAmountCurrent: bigint;
    assetAmountInit: bigint;
    assetAmountCurrent: bigint;
    groupInitWeight: bigint;
    groupFinalWeight: bigint;
    swapFee: bigint;
    updateWeightDuration: bigint;
  }

  let lbpStarterContract: ethers.Contract | null = $state(null);
  let filter: ethers.DeferredTopicFilter | null = $state(null);
  let lbpStarterCreated: LBPStarterCreated[] = $state([]);
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
    lbpStarterCreated = await Promise.all(events.map(async (event) => {
      const eventLog = event as EventLog;
      const contractAddress = eventLog.args[3];
      const LBPContract = new ethers.Contract(contractAddress, LBP_STARTER_ABI, $wallet as ContractRunner);
      const groupAmountCurrent = await LBPContract.groupAmountCurrent();
      const assetAmountCurrent = await LBPContract.assetAmountCurrent();
      return {
        creator: eventLog.args[0],
        group: eventLog.args[1],
        asset: eventLog.args[2],
        contract: contractAddress,
        groupAmountInit: formatEther(eventLog.args[4]),
        groupAmountCurrent: formatEther(groupAmountCurrent),
        assetAmountInit: formatEther(eventLog.args[5]),
        assetAmountCurrent: formatEther(assetAmountCurrent),
        groupInitWeight: eventLog.args[6],
        groupFinalWeight: eventLog.args[7],
        swapFee: eventLog.args[8],
        updateWeightDuration: eventLog.args[9],
      };
    }));
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
            <td>{lbp.contract}</td>
            <td></td>
            <td>{lbp.groupAmountCurrent} / {lbp.groupAmountInit}</td>
            <td>{lbp.assetAmountCurrent} / {lbp.assetAmountInit}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
