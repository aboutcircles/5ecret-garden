<script lang="ts">
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import SelectContact from '$lib/pages/SelectContact.svelte';
  import { contacts } from '$lib/stores/contacts';
  import type { Profile } from '@circles-sdk/profiles';
  import SelectAsset from './2_Asset.svelte';
  import Amount from './3_Amount.svelte';
  import type { SendFlowContext } from '$lib/flows/send/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { transitiveTransfer } from '$lib/pages/SelectAsset.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';

  export let contentApi: PopupContentApi;
  export let context: SendFlowContext;
  let allowAssetSelection: boolean = false;

  async function handleSelect(
    event: CustomEvent<{ address: string; profile: Profile }>
  ) {
    console.log(context);

    context.selectedAddress = event.detail.address;
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
      contentApi.open({
        title: 'Select Asset',
        component: SelectAsset,
        props: {
          context: context,
        },
      });
    } else {
      contentApi.open({
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
  <p class="text-2xl font-bold mt-14">Send Circles</p>
  {#if contacts}
    <SelectContact
      store={contacts}
      selectedAddress={context.selectedAddress}
      on:select={handleSelect}
    />
  {/if}
</FlowDecoration>
