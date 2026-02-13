<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { openStep } from '$lib/shared/flow/runtime';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import type { AdminUnifiedProduct, AdminOdooConnection } from '$lib/areas/admin/types';
  import type { AdminNewProductFlowContext } from './context';
  import CatalogStep from './2_Catalog.svelte';
  import { shortenAddress } from '$lib/shared/utils/shared';

  interface Props {
    context?: AdminNewProductFlowContext;
    connections: AdminOdooConnection[];
    existingProducts: AdminUnifiedProduct[];
    onExecute: (payload: {
      type: 'odoo' | 'codedispenser';
      route?: any;
      odoo?: any;
      code?: any;
    }) => Promise<void>;
    onCreateConnection: (payload: { connection: any }) => Promise<AdminOdooConnection>;
  }

  let {
    context = $bindable({
      chainId: 100,
      enabled: true,
      selectedType: 'codedispenser',
      poolId: '',
      downloadUrlTemplate: '',
      codesTextarea: '',
      odooProductCode: '',
      selectedConnectionKey: '',
    }),
    connections,
    existingProducts,
    onExecute,
    onCreateConnection,
  }: Props = $props();

  function goNext(addr: Address, name?: string): void {
    context.seller = addr;
    openStep({
      title: (name ?? '').trim() || shortenAddress(String(addr)),
      component: CatalogStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-catalog',
    });
  }

  function handleSelect(addr: unknown, profile?: { name?: string | null; registeredName?: string | null }): void {
    const name = profile?.name || profile?.registeredName || '';
    goNext(addr as Address, "Products: " + name);
  }

</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader
      step={1}
      total={6}
      title="Seller"
      subtitle="Select the avatar that created the product you want to offer."
      labels={['Seller', 'Catalog', 'Type', 'Connection', 'Details', 'Summary']}
    />

    <SearchAvatar
      avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
      selectedAddress={context.seller}
      onselect={handleSelect}
      searchType="send"
    />
  </div>
</FlowDecoration>
