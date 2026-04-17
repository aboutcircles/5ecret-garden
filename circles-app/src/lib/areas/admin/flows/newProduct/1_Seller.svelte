<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { openStep } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import { NEW_PRODUCT_FLOW_SCAFFOLD_BASE } from './constants';
  import type { AdminUnifiedProduct, AdminOdooConnection } from '$lib/areas/admin/types';
  import type { AdminNewProductFlowContext } from './context';
  import CatalogStep from './2_Catalog.svelte';
  import { shortenAddress } from '$lib/shared/utils/shared';

  interface Props {
    context?: AdminNewProductFlowContext;
    connections: AdminOdooConnection[];
    existingProducts: AdminUnifiedProduct[];
    onExecute: (payload: {
      type: 'odoo' | 'codedispenser' | 'unlock';
      route?: any;
      odoo?: any;
      code?: any;
      unlock?: any;
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
      useLocalStock: false,
      localAvailableQty: null,
      selectedConnectionKey: '',
      lockAddress: '',
      rpcUrl: '',
      servicePrivateKey: '',
      unlockTimingMode: 'duration',
      durationSeconds: 86400,
      expirationUnix: null,
      keyManagerMode: 'buyer',
      fixedKeyManager: '',
      locksmithBase: 'https://locksmith.unlock-protocol.com',
      locksmithToken: '',
      totalInventory: 0,
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

<FlowStepScaffold
  {...NEW_PRODUCT_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Seller"
  subtitle="Select the avatar that created the product you want to offer."
>

    <SearchAvatar
      avatarTypes={['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization']}
      selectedAddress={context.seller}
      onselect={handleSelect}
      searchType="send"
    />
  </FlowStepScaffold>
