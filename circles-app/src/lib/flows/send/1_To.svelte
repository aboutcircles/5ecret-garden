<script lang="ts">
  import SelectAsset from './2_Asset.svelte';
  import Amount from './3_Amount.svelte';
  import type { SendFlowContext } from '$lib/flows/send/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { transitiveTransfer } from '$lib/pages/SelectAsset.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { popupControls } from '$lib/stores/popUp';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';

  export let context: SendFlowContext = {
    selectedAddress: '',
    transitiveOnly: false,
    selectedAsset: {} as TokenBalanceRow,
    amount: undefined,
  };
  let allowAssetSelection: boolean = false;

  async function handleSelect(
    event: CustomEvent<{ avatar: string }>
  ) {
    console.log('Selected:', event.detail.avatar);

    context.selectedAddress = event.detail.avatar;
    context.selectedAsset = transitiveTransfer();

    if (
      !$circles ||
      !$avatar ||
      !$avatar.avatarInfo ||
      !context.selectedAddress
    ) {
      return;
    }

    // If the avatars are on different versions, we need to allow asset selection
    const selectedAddressInfo = await $circles.data.getAvatarInfo(
      context.selectedAddress
    );
    if ($avatar.avatarInfo.version !== selectedAddressInfo?.version) {
      allowAssetSelection = true;
    }

    if (allowAssetSelection) {
      popupControls.open({
        title: 'Select Asset',
        component: SelectAsset,
        props: {
          context: context,
        },
      });
    } else {
      popupControls.open({
        title: 'Enter Amount',
        component: Amount,
        props: {
          context: context,
        },
      });
    }
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Send Circles</p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    on:select={handleSelect}
    searchType='send'
  />
  <!-- <SelectContact
    store={contacts}
    selectedAddress={context.selectedAddress}
    on:select={handleSelect}
  /> -->
</FlowDecoration>
