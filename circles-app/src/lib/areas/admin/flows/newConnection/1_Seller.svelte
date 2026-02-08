<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/shared/state/popup';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import type { AdminNewConnectionFlowContext } from './context';
  import DetailsStep from './2_Details.svelte';

  interface Props {
    context?: AdminNewConnectionFlowContext;
    onCreate: (payload: { connection: any }) => Promise<void>;
  }

  let {
    context = $bindable({
      chainId: 100,
      odooUrl: '',
      odooDb: '',
      odooUid: 0,
      odooKey: '',
      salePartnerId: null,
      jsonrpcTimeoutMs: 30000,
      fulfillInheritRequestAbort: false,
      enabled: true,
    }),
    onCreate,
  }: Props = $props();

  function goNext(addr: Address): void {
    context.seller = addr;
    popupControls.open({
      title: 'Enter Odoo connection details',
      component: DetailsStep,
      props: { context, onCreate },
      id: 'admin-new-connection-details',
    });
  }

  function handleSelect(addr: unknown): void {
    goNext(addr as Address);
  }
</script>

<div class="space-y-3">
  <p class="text-sm opacity-70">Select the seller (avatar) to create an Odoo connection for.</p>
  <SearchAvatar
    avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
    selectedAddress={context.seller}
    onselect={handleSelect}
    searchType="send"
  />
</div>
