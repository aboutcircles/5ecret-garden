<script lang="ts">
  import {
    adminProductTypeLabels,
    resolveAdminProductType,
    type AdminUnifiedProduct
  } from '$lib/admin/types';

  const sampleProducts: AdminUnifiedProduct[] = [
    {
      key: 'prod-route',
      chainId: 100,
      seller: '0x1111111111111111111111111111111111111111',
      sku: 'ROUTE-ONLY-001'
    },
    {
      key: 'prod-odoo',
      chainId: 100,
      seller: '0x2222222222222222222222222222222222222222',
      sku: 'ODOO-001',
      odoo: {} as any
    },
    {
      key: 'prod-code',
      chainId: 100,
      seller: '0x3333333333333333333333333333333333333333',
      sku: 'CODE-001',
      code: {} as any
    }
  ];

  const typeContractRows = [
    {
      domain: 'market',
      file: '$lib/domains/market/model/types.ts',
      exports: 'AggregatedCatalogItem, SchemaOrgOfferLite, SchemaOrgProductLite, ...'
    },
    {
      domain: 'orders',
      file: '$lib/orders/types.ts',
      exports: 'OrderSnapshot, OrderStatusHistory, OrderStatusEventPayload, ...'
    },
    {
      domain: 'admin',
      file: '$lib/admin/types.ts',
      exports: 'AdminUnifiedProduct, AdminProductType, resolveAdminProductType(...)'
    }
  ];

  const sampleOrderEvent = {
    orderId: 'order-42',
    at: new Date().toISOString(),
    status: 'PROCESSING',
    source: 'kitchen-sink-demo'
  };
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Data & Types</h2>
  <p class="text-sm opacity-70">
    Contract-focused playground for market/order/admin type modules and lightweight typed mock objects.
  </p>

  <div class="space-y-2">
    <h3 class="font-medium">Type contract index</h3>
    <div class="overflow-x-auto">
      <table class="table table-xs">
        <thead>
          <tr><th>Domain</th><th>Module</th><th>Exports (excerpt)</th></tr>
        </thead>
        <tbody>
          {#each typeContractRows as row}
            <tr>
              <td><span class="badge badge-outline badge-sm">{row.domain}</span></td>
              <td><code>{row.file}</code></td>
              <td class="opacity-80">{row.exports}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Admin product type resolution</h3>
    <p class="text-sm opacity-70">
      Demonstrates <code>resolveAdminProductType</code> and human label mapping from <code>$lib/admin/types.ts</code>.
    </p>
    <div class="space-y-2">
      {#each sampleProducts as product (product.key)}
        {@const resolvedType = resolveAdminProductType(product)}
        <div class="rounded-lg border border-base-300 p-3 bg-base-200/20 text-sm flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="font-medium">{product.sku}</div>
            <div class="opacity-70 text-xs">{product.key} · seller {product.seller}</div>
          </div>
          <span class="badge badge-primary badge-sm">{adminProductTypeLabels[resolvedType]}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">Order event payload snapshot (mock)</h3>
    <div class="rounded-lg border border-base-300 p-3 bg-base-200/20 text-xs">
      <pre class="whitespace-pre-wrap break-all">{JSON.stringify(sampleOrderEvent, null, 2)}</pre>
    </div>
  </div>
</section>
