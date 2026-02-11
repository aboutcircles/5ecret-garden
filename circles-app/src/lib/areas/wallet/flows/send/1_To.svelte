rofl<script lang="ts">
  import SelectAsset from './2_Asset.svelte';
  import SelectAmount from './3_Amount.svelte';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { openFlowPopup } from '$lib/shared/state/popup';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import type { Address } from '@circles-sdk/utils';

  interface Props {
    context?: SendFlowContext;
  }

  let {
    context = $bindable({
      selectedAddress: undefined,
      transitiveOnly: false,
      selectedAsset: undefined as any,
      amount: undefined,
    }),
  }: Props = $props();

  $effect(() => {
    if (context.selectedAddress && context.selectedAsset) {
      openFlowPopup({
        title: 'Enter Amount',
        component: SelectAmount,
        props: {
          context: context,
        },
      });
    }
  });

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

    if (context.selectedAsset) {
      openFlowPopup({
        title: 'Enter Amount',
        component: SelectAmount,
        props: {
          context: context,
        },
      });
    } else {
      openFlowPopup({
        title: 'Select Asset',
        component: SelectAsset,
        props: {
          context: context,
        },
      });
    }
  }
</script>

<FlowDecoration>
  <SearchAvatar
    avatarTypes={["CrcV2_RegisterHuman","CrcV2_RegisterOrganization"]}
    selectedAddress={context.selectedAddress}
    {onselect}
    searchType="send"
  />
</FlowDecoration>
