<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import LBP_STARTER_ABI from '$lib/utils/abi/LBP_STARTER';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { ethers } from 'ethers';
  import type { ContractRunner, EventLog } from 'ethers';
  import AddLiquidity from '$lib/components/AddLiquidity.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/stores/popUp';

  const LBP_STARTER_ADDRESS = '0x3b36d73506c3e75fcacb27340faa38ade1cbaf0a';

  interface LBPStarterCreatedEvent {
    creator: Address;
    group: Address;
    asset: Address;
    contract: Address;
  }

  let lbpStarterContract: ethers.Contract | null = $state(null);
  let filter: ethers.DeferredTopicFilter | null = $state(null);
  let lbpStarterCreatedEvents: LBPStarterCreatedEvent[] = $state([]);
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
    lbpStarterCreatedEvents = events.map((event) => {
      const eventLog = event as EventLog;
      return {
        creator: eventLog.args[0],
        group: eventLog.args[1],
        asset: eventLog.args[2],
        contract: eventLog.args[3],
      };
    });
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
    <table class="table mt-4 table-zebra">
      <!-- head -->
      <thead>
        <tr>
          <th></th>
          <th>Address</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each lbpStarterCreatedEvents as event}
          <tr>
            <th></th>
            <td>{event.contract}</td>
            <td></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
