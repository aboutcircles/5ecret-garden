<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/stores/popup';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import type { AdminUnifiedProduct, AdminOdooConnection } from '$lib/admin/types';
  import type { AdminNewProductFlowContext } from './context';
  import CatalogStep from './2_Catalog.svelte';

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

  function goNext(addr: Address): void {
    context.seller = addr;
    popupControls.open({
      title: 'Select catalog product',
      component: CatalogStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      id: 'admin-new-product-catalog',
    });
  }

  function handleSelect(addr: unknown): void {
    goNext(addr as Address);
  }
</script>

<div class="space-y-3">
  <p class="text-sm opacity-70">Select the seller (avatar) for which you want to configure a product.</p>
  <SearchAvatar
    avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
    selectedAddress={context.seller}
    onselect={handleSelect}
    searchType="send"
  />
</div>
