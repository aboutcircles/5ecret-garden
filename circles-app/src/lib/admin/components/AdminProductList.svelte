<script lang="ts">
  import AdminProductRow from './AdminProductRow.svelte';
  import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
  import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
  import type { AdminUnifiedProduct, AdminProductType } from '../types';
  import { resolveAdminProductType, adminProductTypeLabels } from '../types';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import AdminStatusBadge from '$lib/admin/components/AdminStatusBadge.svelte';
  import { adminOdooConnectionKey } from '$lib/admin/helpers';
  import type { AdminOdooConnection } from '../types';
  import { shortenAddress } from '$lib/utils/shared';

  interface Props {
    products: AdminUnifiedProduct[];
    onSelect?: (product: AdminUnifiedProduct) => void;
    productTypes?: AdminProductType[];
    connections?: AdminOdooConnection[];
    onEditConnection?: (connection: AdminOdooConnection | null) => void;
  }

  let {
    products,
    onSelect,
    productTypes: productTypesProp = ['odoo', 'codedispenser'],
    connections = [],
    onEditConnection,
  }: Props = $props();

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

  const isGroupedView = $derived(
    selectedType === 'odoo' || selectedType === 'codedispenser'
  );

  type SellerGroup = {
    key: string;
    chainId: number;
    seller: string;
    products: typeof filteredProducts;
    connection?: AdminOdooConnection;
  };

  const groupedProducts = $derived(() => {
    if (!isGroupedView) {
      return [] as SellerGroup[];
    }

    const map = new Map<string, SellerGroup>();
    for (const item of filteredProducts) {
      const key = adminOdooConnectionKey(item.product.chainId, item.product.seller);
      const existing = map.get(key);
      if (existing) {
        existing.products = [...existing.products, item];
        continue;
      }

      map.set(key, {
        key,
        chainId: item.product.chainId,
        seller: item.product.seller,
        products: [item],
        connection:
          selectedType === 'odoo'
            ? connections.find(
                (connection) =>
                  adminOdooConnectionKey(connection.chainId, connection.seller) === key
              )
            : undefined,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.seller !== b.seller) return a.seller.localeCompare(b.seller);
      return a.chainId - b.chainId;
    });
  });

  function summarizeGroup(group: SellerGroup): { label: string; variant: 'success' | 'warning' | 'error' } {
    const total = group.products.length;
    let disabled = 0;
    let revoked = 0;

    for (const item of group.products) {
      const mappingEnabled = item.type === 'odoo' ? item.product.odoo?.enabled : item.product.code?.enabled;
      if (mappingEnabled === false) disabled += 1;
      const revokedAt = item.type === 'odoo' ? item.product.odoo?.revokedAt : item.product.code?.revokedAt;
      if (revokedAt) revoked += 1;
    }

    const inactive = disabled + revoked;
    if (inactive > 0) {
      return { label: `${inactive}/${total} inactive`, variant: 'warning' };
    }
    return { label: `${total} active`, variant: 'success' };
  }

  function resolveGroupMeta(group: SellerGroup): string {
    if (selectedType === 'odoo' && group.connection) {
      return `Chain ${group.chainId} · DB ${group.connection.odooDb}`;
    }
    return `Chain ${group.chainId}`;
  }

  function resolveGroupSubtitle(group: SellerGroup): string {
    if (selectedType === 'odoo') {
      return group.connection?.odooUrl ?? 'No Odoo connection configured';
    }
    return 'Voucher code seller';
  }

  let expandedGroups = $state<Record<string, boolean>>({});

  $effect(() => {
    if (!isGroupedView || groupedProducts().length === 0) return;
    const updates: Record<string, boolean> = {};
    let changed = false;
    for (const group of groupedProducts()) {
      if (expandedGroups[group.key] === undefined) {
        updates[group.key] = group.products.length <= 3;
        changed = true;
      }
    }
    if (changed) {
      expandedGroups = { ...expandedGroups, ...updates };
    }
  });

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
  {:else if isGroupedView}
    <div class="space-y-3">
      {#each groupedProducts() as group (group.key)}
        {@const summary = summarizeGroup(group)}
        <details
          class="group rounded-xl border bg-base-100"
          bind:open={expandedGroups[group.key]}
        >
          <summary class="list-none cursor-pointer">
            <div class="flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2 min-w-0">
                  <Avatar address={group.seller} view="small" clickable={true} />
                  <span class="font-semibold truncate">{shortenAddress(group.seller)}</span>
                </div>
                <div class="text-xs opacity-70 truncate">{resolveGroupSubtitle(group)}</div>
                <div class="text-xs opacity-60">{resolveGroupMeta(group)}</div>
              </div>
              <div class="flex flex-col items-start sm:items-end gap-2">
                {#if selectedType === 'odoo'}
                  <button
                    type="button"
                    class="btn btn-xs btn-outline"
                    onclick={(event) => {
                      event.preventDefault();
                      onEditConnection?.(group.connection ?? null);
                    }}
                  >
                    {group.connection ? 'Edit connection' : 'Add connection'}
                  </button>
                {/if}
                <div class="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
                  <AdminStatusBadge
                    label={`Products ${group.products.length}`}
                    variant="neutral"
                  />
                  <AdminStatusBadge
                    label={summary.label}
                    variant={summary.variant}
                  />
                  {#if selectedType === 'odoo'}
                    {#if group.connection}
                      <AdminStatusBadge
                        label={group.connection.enabled ? 'Conn on' : 'Conn off'}
                        variant={group.connection.enabled ? 'success' : 'warning'}
                      />
                      {#if group.connection.revokedAt}
                        <AdminStatusBadge label="Revoked" variant="warning" />
                      {/if}
                    {:else}
                      <AdminStatusBadge label="No connection" variant="warning" />
                    {/if}
                  {/if}
                </div>
              </div>
            </div>
          </summary>
          <div class="px-3 pb-2 sm:px-4">
            <div class="text-xs text-base-content/50 flex items-center gap-2">
              <span class="uppercase tracking-wide">Seller products</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class={`h-3.5 w-3.5 shrink-0 transition-transform ${expandedGroups[group.key] ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
          <div class="px-3 pb-3 sm:px-4 sm:pb-4">
            <div class="space-y-2">
              {#each group.products as item (item.product.key)}
                <AdminProductRow
                  product={item.product}
                  productType={item.type}
                  onSelect={onSelect}
                  hideSeller={true}
                />
              {/each}
            </div>
          </div>
        </details>
      {/each}
    </div>
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