<script lang="ts">
  import type { GroupMintFlowContext } from '$lib/flows/mintGroupTokens/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SelectAsset from '$lib/flows/mintGroupTokens/2_Asset.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import type { Address } from '@circles-sdk/utils';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';

  interface Props {
    context?: GroupMintFlowContext;
  }

  let {
    context = $bindable({
      selectedAddress: undefined,
      selectedAsset: {} as TokenBalanceRow,
      amount: undefined,
    }),
  }: Props = $props();

  function onselect(address: Address) {
    console.log('Selected address', address);
    context.selectedAddress = address;

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
  <p class="text-base-content/70 mt-2">
    If you hold CRC created by members of a group, you can turn them into tokens of that group
  </p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    {onselect}
    searchType="send"
  />
</FlowDecoration>
