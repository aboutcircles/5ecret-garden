<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { openStep } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import { NEW_CONNECTION_FLOW_SCAFFOLD_BASE } from './constants';
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

<FlowStepScaffold
  {...NEW_CONNECTION_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Seller"
  subtitle="Choose the seller for this Odoo connection."
>

    <SearchAvatar
      avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
      selectedAddress={context.seller}
      onselect={handleSelect}
      searchType="send"
    />
  </FlowStepScaffold>
