<script lang="ts">
  import AdminProductRow from './AdminProductRow.svelte';
  import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
  import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
  import type { AdminUnifiedProduct, AdminProductType } from '../types';
  import { resolveAdminProductType, adminProductTypeLabels } from '../types';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import AdminStatusBadge from '$lib/areas/admin/components/AdminStatusBadge.svelte';
  import { adminOdooConnectionKey } from '$lib/areas/admin/helpers';
  import type { AdminOdooConnection } from '../types';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import { T } from '$lib/design-system/tokens';

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
    productTypes: productTypesProp = ['odoo', 'codedispenser', 'unlock'],
    connections = [],
    onEditConnection,
  }: Props = $props();

  const productTypes = $derived(
    productTypesProp.length > 0 ? productTypesProp : (['odoo', 'codedispenser', 'unlock'] as AdminProductType[])
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
    selectedType === 'odoo' || selectedType === 'codedispenser' || selectedType === 'unlock'
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
      const mappingEnabled =
        item.type === 'odoo'
          ? item.product.odoo?.enabled
          : item.type === 'codedispenser'
            ? item.product.code?.enabled
            : item.product.unlock?.enabled;
      if (mappingEnabled === false) disabled += 1;
      const revokedAt =
        item.type === 'odoo'
          ? item.product.odoo?.revokedAt
          : item.type === 'codedispenser'
            ? item.product.code?.revokedAt
            : item.product.unlock?.revokedAt;
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
    if (selectedType === 'unlock') {
      return 'Unlock ticket seller';
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

<div style="display:flex;flex-direction:column;gap:12px;">
  {#if productTypes.length > 1}
    <Tabs bind:selected={selectedType} size="sm" variant="boxed">
      {#each productTypes as type}
        <Tab id={type} title={adminProductTypeLabels[type]} badge={counts[type]} />
      {/each}
    </Tabs>
  {/if}

  {#if filteredProducts.length === 0}
    <p style="font-size:13px;color:{T.inkMuted};">
      No {adminProductTypeLabels[selectedType ?? 'odoo']} products yet.
    </p>
  {:else if isGroupedView}
    <div style="display:flex;flex-direction:column;gap:12px;">
      {#each groupedProducts() as group (group.key)}
        {@const summary = summarizeGroup(group)}
        <details
          style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};"
          bind:open={expandedGroups[group.key]}
        >
          <summary style="list-style:none;cursor:pointer;">
            <div style="display:flex;flex-direction:column;gap:12px;padding:12px 16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div style="min-width:0;display:flex;flex-direction:column;gap:4px;">
                  <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                    <Avatar address={group.seller} view="small" clickable={true} />
                    <span style="font-weight:580;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{shortenAddress(group.seller)}</span>
                  </div>
                  <div style="font-size:11.5px;color:{T.inkMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{resolveGroupSubtitle(group)}</div>
                  <div style="font-size:11.5px;color:{T.inkSubtle};">{resolveGroupMeta(group)}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
                  {#if selectedType === 'odoo'}
                    <button
                      type="button"
                      style="height:26px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkBody};font-size:11.5px;font-weight:580;cursor:pointer;"
                      onclick={(event) => {
                        event.preventDefault();
                        onEditConnection?.(group.connection ?? null);
                      }}
                    >
                      {group.connection ? 'Edit connection' : 'Add connection'}
                    </button>
                  {/if}
                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;justify-content:flex-end;">
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
            </div>
          </summary>
          <div style="padding:0 16px 8px;">
            <div style="font-size:11.5px;color:{T.inkFaint};display:flex;align-items:center;gap:8px;">
              <span style="text-transform:uppercase;letter-spacing:0.06em;">Seller products</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style="width:14px;height:14px;flex-shrink:0;transition:transform 0.2s ease-out;{expandedGroups[group.key] ? 'transform:rotate(180deg);' : ''}"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
          <div style="padding:0 16px 16px;">
            <div style="display:flex;flex-direction:column;gap:8px;">
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