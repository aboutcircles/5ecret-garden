<script lang="ts">
  import AdminProductRow from './AdminProductRow.svelte';
  import Tabs from '$lib/components/tabs/Tabs.svelte';
  import Tab from '$lib/components/tabs/Tab.svelte';
  import type { AdminUnifiedProduct, AdminProductType } from '../types';
  import { resolveAdminProductType, adminProductTypeLabels } from '../types';

  interface Props {
    products: AdminUnifiedProduct[];
    onSelect?: (product: AdminUnifiedProduct) => void;
    productTypes?: AdminProductType[];
  }

  let { products, onSelect, productTypes: productTypesProp = ['odoo', 'codedispenser'] }: Props = $props();

  const productTypes = $derived(
    productTypesProp.length > 0 ? productTypesProp : (['odoo', 'codedispenser'] as AdminProductType[])
  );
  let selectedType: AdminProductType | null = $state(null);

  const typedProducts = $derived(
    products.map((product) => ({
      product,
      type: resolveAdminProductType(product),
    }))
  );

  const counts = $derived(
    productTypes.reduce((acc, type) => {
      acc[type] = typedProducts.filter((item) => item.type === type).length;
      return acc;
    }, {} as Record<AdminProductType, number>)
  );

  const filteredProducts = $derived(
    selectedType
      ? typedProducts.filter((item) => item.type === selectedType)
      : typedProducts
  );

  $effect(() => {
    if (!selectedType || !productTypes.includes(selectedType)) {
      selectedType = productTypes[0] ?? null;
    }
  });
</script>

<div class="space-y-3">
  {#if productTypes.length > 1}
    <Tabs bind:selected={selectedType} size="sm" variant="boxed">
      {#each productTypes as type}
        <Tab id={type} title={adminProductTypeLabels[type]} badge={counts[type]} />
      {/each}
    </Tabs>
  {/if}

  {#if filteredProducts.length === 0}
    <p class="text-sm opacity-70">
      No {adminProductTypeLabels[selectedType ?? 'odoo']} products yet.
    </p>
  {:else}
    {#each filteredProducts as item (item.product.key)}
      <AdminProductRow
        product={item.product}
        productType={item.type}
        onSelect={onSelect}
      />
    {/each}
  {/if}
</div>