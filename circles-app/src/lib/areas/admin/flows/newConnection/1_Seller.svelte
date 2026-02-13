<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { openStep } from '$lib/shared/flow/runtime';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
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
    openStep({
      title: 'New Odoo connection',
      component: DetailsStep,
      props: { context, onCreate },
      key: 'admin-new-connection-details',
    });
  }

  function handleSelect(addr: unknown): void {
    goNext(addr as Address);
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader step={1} total={2} title="Seller" subtitle="Choose the seller for this Odoo connection." labels={['Seller', 'Details']} />

    <SearchAvatar
      avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
      selectedAddress={context.seller}
      onselect={handleSelect}
      searchType="send"
    />
  </div>
</FlowDecoration>
