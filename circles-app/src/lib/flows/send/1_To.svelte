<script lang="ts">
  import SelectAsset from './2_Asset.svelte';
  import type { SendFlowContext } from '$lib/flows/send/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { popupControls } from '$lib/stores/popUp';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import type { Address } from '@circles-sdk/utils';

  interface Props {
    context?: SendFlowContext;
  }

  let {
    context = $bindable({
      selectedAddress: undefined,
      transitiveOnly: false,
      selectedAsset: {} as TokenBalanceRow,
      amount: undefined,
    }),
  }: Props = $props();

  async function onselect(selectedAvatar: Address) {
    context.selectedAddress = selectedAvatar;

    if (
      !$circles ||
      !avatarState.avatar ||
      !avatarState.avatar.avatarInfo ||
      !context.selectedAddress
    ) {
      return;
    }

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
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    {onselect}
    searchType="send"
  />
</FlowDecoration>
