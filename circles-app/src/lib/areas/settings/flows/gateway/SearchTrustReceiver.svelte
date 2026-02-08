<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import ConfirmGatewayTrust from '$lib/areas/settings/flows/gateway/ConfirmGatewayTrust.svelte';

  interface Props {
    gateway: string;
    onTrusted?: () => void | Promise<void>;
  }

  let { gateway, onTrusted }: Props = $props();

  const avatarTypes = [
    'CrcV2_RegisterHuman',
    'CrcV2_RegisterOrganization',
    'CrcV2_RegisterGroup'
  ];

  function onselect(address: string) {
    popupControls.open({
      title: 'Confirm trust',
      component: ConfirmGatewayTrust,
      props: {
        gateway,
        trustReceiver: address,
        onTrusted
      },
      key: `pg-trust:${gateway}:${address}`
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-3">
    <p class="text-sm text-base-content/70">
      Search the full network to add a trusted account for this gateway.
    </p>
    <SearchAvatar
      avatarTypes={avatarTypes}
      searchType="contact"
      {onselect}
    />
  </div>
</FlowDecoration>