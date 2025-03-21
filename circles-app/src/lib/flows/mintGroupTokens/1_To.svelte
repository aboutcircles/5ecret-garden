<script lang="ts">
  import { type SelectedEvent } from '$lib/pages/SelectContact.svelte';
  import type { GroupMintFlowContext } from '$lib/flows/mintGroupTokens/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SelectAsset from '$lib/flows/mintGroupTokens/2_Asset.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';

  export let context: GroupMintFlowContext = {
    selectedAddress: undefined,
    selectedAsset: {} as TokenBalanceRow,
    amount: undefined,
  };

  function handleSelect(
    event: CustomEvent<SelectedEvent>
  ) {
    console.log('Selected address', event.detail.address);
    context.selectedAddress = event.detail.address;

    popupControls.open({
      title: 'Select Asset',
      component: SelectAsset,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Mint Group Token</p>
  <p class="text-gray-500 mt-2">
    If you hold CRC created by members of a group, you can turn them into tokens of that group
  </p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    on:select={handleSelect}
    searchType="send"
  />
</FlowDecoration>
