<script lang="ts">
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { MaxUint256 } from 'ethers6';
  import { circles } from '$lib/stores/circles';

  let mintPolicyAddress: string =
    $circles?.circlesConfig.baseGroupMintPolicy ?? '';

  let fromAddress: string = $state('');
  let toAddress: string = $state('');
  let result: any = $state();

  async function calculatePath() {
    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }

    result = await $circles.v2Pathfinder?.getArgsForPath(
      fromAddress,
      toAddress,
      MaxUint256.toString()
    );
  }
</script>

<div class="flex flex-col w-[90%] lg:w-3/5 border rounded-lg px-6 py-8 mt-20">
  <div class="p-4">
    <h2 class="text-lg font-medium">Calculate path</h2>
    <div class="mt-3 space-y-2">
      <div>
        <label for="fromAddress" class="block text-sm font-medium text-gray-700"
          >From</label
        >
        <input
          bind:value={fromAddress}
          type="text"
          id="fromAddress"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          placeholder="0x....."
        />
      </div>
      <div>
        <label for="toAddress" class="block text-sm font-medium text-gray-700"
          >To</label
        >
        <input
          bind:value={toAddress}
          type="text"
          id="toAddress"
          class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
          placeholder="0x....."
        />
      </div>
      <ActionButton action={calculatePath}>Calculate path</ActionButton>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  </div>
</div>
