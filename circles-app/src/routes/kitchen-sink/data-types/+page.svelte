<script lang="ts">
  import {
    adminProductTypeLabels,
    resolveAdminProductType,
    type AdminUnifiedProduct
  } from '$lib/areas/admin/types';
  import { T } from '$lib/design-system/tokens';

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
      file: '$lib/areas/market/model.ts',
      exports: 'AggregatedCatalogItem, SchemaOrgOfferLite, SchemaOrgProductLite, ...'
    },
    {
      domain: 'orders',
      file: '$lib/areas/market/orders/types.ts',
      exports: 'OrderSnapshot, OrderStatusHistory, OrderStatusEventPayload, ...'
    },
    {
      domain: 'admin',
      file: '$lib/areas/admin/types.ts',
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

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Data & Types</h2>
  <p style="font-size:13px;color:{T.inkMuted};margin:0;">
    Contract-focused playground for market/order/admin type modules and lightweight typed mock objects.
  </p>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Type contract index</h3>
    <div class="overflow-x-auto">
      <table class="table table-xs">
        <thead>
          <tr><th>Domain</th><th>Module</th><th>Exports (excerpt)</th></tr>
        </thead>
        <tbody>
          {#each typeContractRows as row}
            <tr>
              <td><span style="display:inline-block;border:1px solid {T.hairline};color:{T.inkMuted};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:540;">{row.domain}</span></td>
              <td><code>{row.file}</code></td>
              <td class="opacity-80">{row.exports}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Admin product type resolution</h3>
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">
      Demonstrates <code>resolveAdminProductType</code> and human label mapping from <code>$lib/areas/admin/types.ts</code>.
    </p>
    <div style="display:flex;flex-direction:column;gap:8px;">
      {#each sampleProducts as product (product.key)}
        {@const resolvedType = resolveAdminProductType(product)}
        <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;background:{T.pageDeep};font-size:13px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">
          <div>
            <div style="font-weight:500;">{product.sku}</div>
            <div style="color:{T.inkMuted};font-size:11.5px;">{product.key} · seller {product.seller}</div>
          </div>
          <span style="display:inline-block;background:rgba(88,73,212,0.12);color:{T.primaryDeep};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:580;">{adminProductTypeLabels[resolvedType]}</span>
        </div>
      {/each}
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Order event payload snapshot (mock)</h3>
    <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;background:{T.pageDeep};font-size:11.5px;">
      <pre style="white-space:pre-wrap;word-break:break-all;">{JSON.stringify(sampleOrderEvent, null, 2)}</pre>
    </div>
  </div>
</section>
