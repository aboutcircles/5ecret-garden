<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/shared/state/popup';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import type { AdminUnifiedProduct, AdminOdooConnection } from '$lib/admin/types';
  import type { AdminNewProductFlowContext } from './context';
  import CatalogStep from './2_Catalog.svelte';
  import { shortenAddress } from '$lib/utils/shared';

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
    popupControls.open({
      title: (name ?? '').trim() || shortenAddress(String(addr)),
      component: CatalogStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      id: 'admin-new-product-catalog',
    });
  }

  function handleSelect(addr: unknown, profile?: { name?: string | null; registeredName?: string | null }): void {
    const name = profile?.name || profile?.registeredName || '';
    goNext(addr as Address, "Products: " + name);
  }

</script>

<div class="space-y-3">
  <p class="text-sm opacity-70">Select the avatar that created the product you want to offer.</p>
  <SearchAvatar
    avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
    selectedAddress={context.seller}
    onselect={handleSelect}
    searchType="send"
  />
</div>
