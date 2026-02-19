<script lang="ts">
  import SelectAsset from './2_Asset.svelte';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    context?: SendFlowContext;
  }

  let {
    context = $bindable({
      selectedAddress: undefined,
      transitiveOnly: false,
      selectedAsset: {} as TokenBalance,
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
    avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
    selectedAddress={context.selectedAddress}
    {onselect}
    searchType="send"
  />
</FlowDecoration>
