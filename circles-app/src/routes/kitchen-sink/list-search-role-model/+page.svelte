<script lang="ts">
  import { derived, writable } from 'svelte/store';
  import type { Address } from '@circles-sdk/utils';
  import type { GroupRow, TokenBalanceRow, TransactionHistoryRow } from '@circles-sdk/data';
  import type { TrustRow, GatewayRow } from '$lib/areas/settings/model/gatewayTypes';
  import type { AdminUnifiedProduct, AdminProductType, AdminOdooConnection } from '$lib/areas/admin/types';
  import type { MonthlyItem, RangeOverlayEvent } from '$lib/shared/ui/event-history/types';
  import type { AvatarSearchItem } from '../../avatar-search/dev/avatarSearch.types';

  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';

  import ContactRow from '../../contacts/ContactRow.svelte';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import TransactionRow from '../../dashboard/TransactionRow.svelte';
  import GroupRowView from '../../groups/GroupRowView.svelte';
  import SalesOrderRow from '$lib/areas/market/ui/SalesOrderRow.svelte';
  import AvatarSearchRow from '../../avatar-search/dev/AvatarSearchRow.svelte';
  import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
  import BalanceRowPlaceholder from '$lib/shared/ui/lists/placeholders/BalanceRowPlaceholder.svelte';
  import TransactionRowPlaceholder from '$lib/shared/ui/lists/placeholders/TransactionRowPlaceholder.svelte';
  import MarketOrderRowPlaceholder from '$lib/shared/ui/lists/placeholders/MarketOrderRowPlaceholder.svelte';
  import GatewayRowPlaceholder from '$lib/shared/ui/lists/placeholders/GatewayRowPlaceholder.svelte';
  import GatewayTrustedAccountsList from '$lib/areas/settings/ui/components/GatewayTrustedAccountsList.svelte';
  import GatewayRowView from '$lib/areas/settings/ui/components/GatewayRow.svelte';
  import HoldersRow from '$lib/shared/ui/profile/components/HoldersRow.svelte';
  import SearchablePaginatedAddressList from '$lib/shared/ui/profile/components/SearchablePaginatedAddressList.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import AdminProductRow from '$lib/areas/admin/components/AdminProductRow.svelte';
  import AdminProductList from '$lib/areas/admin/components/AdminProductList.svelte';
  import EventHistoryMonthlyList from '$lib/shared/ui/event-history/EventHistoryMonthlyList.svelte';
  import TxEvents from '../../dashboard/TxEvents.svelte';

  type DemoContactRow = {
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
    address: Address;
    contact: { row: { relation: 'mutuallyTrusts' | 'trusts' | 'trustedBy' | 'variesByVersion' } };
  };

  type DemoSalesOrder = {
    key: string;
    orderNumber: string;
    orderDate?: string;
    orderStatus?: string;
    paymentReference?: string | null;
  };

  type DemoTrustRowItem = TrustRow & { showRemove?: boolean; onRemove?: () => void };

  type DemoHolderRow = {
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
  };

  function createStaticStore<T>(items: T[]) {
    const inner = writable({ data: items, next: async () => false, ended: true });
    return { subscribe: inner.subscribe };
  }

  const demoAddresses: Address[] = [
    '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113' as Address,
    '0x6c8757f5f8f5cfdf2f4f4df4d7b0f6f3c9a2f160' as Address,
    '0x9f7b1f789a7248f7c6b74f9f6b9a4d3f2f4d0b11' as Address,
    '0x2f5d12ad7f9b5f6e8a7c4d2b1a9e0c3f7d6a5b44' as Address,
    '0x8c4b8f2f9a3e7c2b5d1f9e8a6b3c5d7f1a2b3c44' as Address,
    '0x5b6f7d8e9c0a1b2c3d4e5f60718293a4b5c6d7e8' as Address,
  ];

  // Contacts list demo
  const contactRows: DemoContactRow[] = demoAddresses.slice(0, 5).map((address, index) => ({
    blockNumber: 230000 + index,
    transactionIndex: index,
    logIndex: index,
    address,
    contact: {
      row: {
        relation: index % 3 === 0 ? 'mutuallyTrusts' : index % 3 === 1 ? 'trusts' : 'trustedBy',
      },
    },
  }));
  const contactsStore = writable(contactRows);
  const contactsQuery = writable('');
  const contactsFiltered = derived([contactsStore, contactsQuery], ([$items, $query]) => {
    const q = ($query ?? '').toLowerCase().trim();
    if (!q) return $items;
    return $items.filter((item) => item.address.toLowerCase().includes(q));
  });
  const contactsPaginated = createPaginatedList(contactsFiltered, { pageSize: 4 });

  // Balances list demo
  const balanceRows: TokenBalanceRow[] = [
    {
      tokenOwner: demoAddresses[0],
      tokenType: 'CrcV2_RegisterHuman',
      circles: 245.23,
      staticCircles: 0,
      crc: 245.23,
      isWrapped: false,
      tokenAddress: demoAddresses[0],
      tokenId: 'CRC',
      blockNumber: 1,
      transactionIndex: 0,
      logIndex: 0,
    } as TokenBalanceRow,
    {
      tokenOwner: demoAddresses[2],
      tokenType: 'CrcV2_ERC20WrapperDeployed_Inflationary',
      circles: 91.87,
      staticCircles: 61.12,
      crc: 30.75,
      isWrapped: true,
      tokenAddress: demoAddresses[2],
      tokenId: 'WCRC',
      blockNumber: 2,
      transactionIndex: 0,
      logIndex: 0,
    } as TokenBalanceRow,
    {
      tokenOwner: demoAddresses[3],
      tokenType: 'CrcV2_RegisterGroup',
      circles: 412.01,
      staticCircles: 120.5,
      crc: 291.51,
      isWrapped: false,
      tokenAddress: demoAddresses[3],
      tokenId: 'GCRC',
      blockNumber: 3,
      transactionIndex: 0,
      logIndex: 0,
    } as TokenBalanceRow,
  ];
  const balanceStore = createStaticStore(balanceRows);

  // Transaction history list demo
  const transactionRows: TransactionHistoryRow[] = [
    {
      from: demoAddresses[0],
      to: demoAddresses[1],
      circles: 24.5,
      timestamp: Math.floor(Date.now() / 1000) - 3600,
    } as TransactionHistoryRow,
    {
      from: demoAddresses[2],
      to: demoAddresses[0],
      circles: 5.75,
      timestamp: Math.floor(Date.now() / 1000) - 8600,
    } as TransactionHistoryRow,
    {
      from: '0x0000000000000000000000000000000000000000' as Address,
      to: demoAddresses[0],
      circles: 30.0,
      timestamp: Math.floor(Date.now() / 1000) - 21600,
    } as TransactionHistoryRow,
  ];
  const transactionStore = createStaticStore(transactionRows);

  // Groups list demo
  const groupRows: GroupRow[] = demoAddresses.slice(0, 4).map((group, i) => ({
    group,
    memberCount: 3 + i * 4,
  })) as GroupRow[];
  const groupsStore = createStaticStore(groupRows);

  // Sales orders demo
  const salesOrders: DemoSalesOrder[] = [
    {
      key: 'so-001',
      orderNumber: 'SO-2026-001',
      orderDate: new Date(Date.now() - 86400000).toISOString(),
      orderStatus: 'paid',
      paymentReference: 'Reference 9281',
    },
    {
      key: 'so-002',
      orderNumber: 'SO-2026-002',
      orderDate: new Date(Date.now() - 172800000).toISOString(),
      orderStatus: 'processing',
      paymentReference: 'Reference 9282',
    },
    {
      key: 'so-003',
      orderNumber: 'SO-2026-003',
      orderDate: new Date(Date.now() - 220000000).toISOString(),
      orderStatus: 'new',
      paymentReference: null,
    },
  ];
  const salesOrderStore = createStaticStore(salesOrders);

  // Avatar search dev demo
  const avatarSearchQuery = writable('');
  const avatarSearchItems: AvatarSearchItem[] = demoAddresses.map((address, i) => ({
    key: `search-${i}`,
    address,
    name: `Result ${i + 1}`,
    avatarType: i % 2 === 0 ? 'CrcV2_RegisterHuman' : 'CrcV2_RegisterOrganization',
    hasProfile: true,
    isContact: i % 2 === 0,
    isBookmarked: i % 3 === 0,
    isVipBookmarked: i % 4 === 0,
    trustRelation: i % 2 === 0 ? 'mutuallyTrusts' : 'trustedBy',
    localRank: i,
    remoteRank: i + 10,
    blockNumber: 10 + i,
    transactionIndex: 0,
    logIndex: 0,
  }));
  const avatarSearchStore = writable(avatarSearchItems);
  const avatarSearchFiltered = derived([avatarSearchStore, avatarSearchQuery], ([$items, $query]) => {
    const q = ($query ?? '').toLowerCase().trim();
    if (!q) return $items;
    return $items.filter((item) => item.address.toLowerCase().includes(q));
  });
  const avatarSearchPaginated = createPaginatedList(avatarSearchFiltered, { pageSize: 5 });

  // Gateway trusted accounts demo
  const gatewayTrustedRows = writable<DemoTrustRowItem[]>([
    {
      trustReceiver: demoAddresses[1],
      expiry: Math.floor(Date.now() / 1000) + 86400 * 90,
      blockNumber: 100,
      transactionIndex: 0,
      logIndex: 0,
      showRemove: true,
    },
    {
      trustReceiver: demoAddresses[2],
      expiry: Math.floor(Date.now() / 1000) + 86400 * 180,
      blockNumber: 101,
      transactionIndex: 0,
      logIndex: 0,
      showRemove: true,
    },
  ]);

  // Payment gateways demo
  const gatewayRows: GatewayRow[] = [
    {
      gateway: demoAddresses[3],
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 4,
      blockNumber: 222,
      transactionIndex: 0,
      logIndex: 0,
      tx: demoAddresses[3],
    },
    {
      gateway: demoAddresses[4],
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 14,
      blockNumber: 223,
      transactionIndex: 0,
      logIndex: 0,
      tx: demoAddresses[4],
    },
  ];
  const gatewayStore = createStaticStore(gatewayRows);

  // Holders list demo
  const holderRows: DemoHolderRow[] = [
    {
      avatar: demoAddresses[0],
      amount: BigInt('123000000000000000000'),
      amountToRedeem: BigInt('0'),
      amountToRedeemInCircles: 0,
    },
    {
      avatar: demoAddresses[1],
      amount: BigInt('54000000000000000000'),
      amountToRedeem: BigInt('0'),
      amountToRedeemInCircles: 0,
    },
  ];
  const holderStore = createStaticStore(holderRows);

  // Searchable paginated address list demo
  const trustRelationsStore = writable<Address[]>(demoAddresses.slice(0, 5));

  // Admin catalog + grouped list demo
  const adminProducts: AdminUnifiedProduct[] = [
    {
      key: 'odoo-1',
      chainId: 100,
      seller: demoAddresses[0],
      sku: 'COFFEE-001',
      route: {
        chainId: 100,
        seller: demoAddresses[0],
        sku: 'COFFEE-001',
        offerType: 'odoo',
        isOneOff: false,
        enabled: true,
      },
      odoo: {
        chainId: 100,
        seller: demoAddresses[0],
        sku: 'COFFEE-001',
        odooProductCode: 'C001',
        enabled: true,
        revokedAt: null,
      },
    },
    {
      key: 'code-1',
      chainId: 100,
      seller: demoAddresses[1],
      sku: 'VOUCHER-25',
      route: {
        chainId: 100,
        seller: demoAddresses[1],
        sku: 'VOUCHER-25',
        offerType: 'codedispenser',
        isOneOff: false,
        enabled: true,
      },
      code: {
        chainId: 100,
        seller: demoAddresses[1],
        sku: 'VOUCHER-25',
        poolId: 'POOL-1',
        downloadUrlTemplate: null,
        enabled: false,
        revokedAt: null,
        poolRemaining: 4,
      },
    },
  ];

  const adminConnections: AdminOdooConnection[] = [
    {
      chainId: 100,
      seller: demoAddresses[0],
      odooUrl: 'https://odoo.demo.example',
      odooDb: 'circles',
      odooUid: 12,
      salePartnerId: 120,
      jsonrpcTimeoutMs: 15000,
      fulfillInheritRequestAbort: null,
      enabled: true,
      revokedAt: null,
    },
  ];
  const adminCatalogRow = adminProducts[0];
  const adminCatalogType: AdminProductType = 'odoo';

  // Event history monthly list demo
  function monthStart(offset: number): number {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() - offset);
    return Math.floor(date.getTime() / 1000);
  }

  const monthlyItems: MonthlyItem[] = [0, 1, 2, 3, 4, 5].map((offset) => {
    const startSec = monthStart(offset);
    const label = new Date(startSec * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    return { startSec, label, count: 2 + (offset % 3) };
  });

  const rangeEvents: RangeOverlayEvent[] = [
    {
      id: 'grant-window',
      title: 'Rewards campaign',
      startDaySec: monthStart(2),
      endDaySec: monthStart(0) - 86400,
    },
  ];

  // Transaction events table demo
  const txEvents = [
    { $type: 'Transfer', LogIndex: 0, From: demoAddresses[0], To: demoAddresses[1], Value: '120000000000000000000' },
    { $type: 'Trust', LogIndex: 1, Truster: demoAddresses[1], Trustee: demoAddresses[2], Value: '0' },
  ];
  let eventsListOpen = $state(true);
  let openRows = $state<Record<number, boolean>>({ 0: true });

  function niceKey(key: string) {
    return key.replace(/\$/g, '').replace(/([A-Z])/g, ' $1').trim();
  }

  function eventDisplayEntries(ev: Record<string, any>) {
    return Object.entries(ev).filter(([k]) => k !== '$type');
  }

  function isOpen(index: number) {
    return !!openRows[index];
  }

  function toggleOpen(index: number) {
    openRows = { ...openRows, [index]: !openRows[index] };
  }

  function toggleEventsList() {
    eventsListOpen = !eventsListOpen;
  }
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-6">
  <div class="space-y-1">
    <h2 class="text-lg font-semibold">List/Search Kitchen Sink</h2>
    <p class="text-sm opacity-75">
      One demo per list type in the inventory report, using production row components and realistic behavior.
    </p>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Contacts list (ContactRow)</h3>
      <ListShell query={contactsQuery} searchPlaceholder="Search contacts" wrapInListContainer={false}>
        <GenericList
          store={contactsPaginated}
          row={ContactRow}
          rowHeight={64}
          expectedPageSize={4}
          maxPlaceholderPages={1}
          placeholderRow={AvatarRowPlaceholder}
        />
      </ListShell>
    </section>

    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Wallet balances (BalanceRow)</h3>
      <GenericList
        store={balanceStore}
        row={BalanceRow}
        rowHeight={72}
        expectedPageSize={3}
        maxPlaceholderPages={1}
        placeholderRow={BalanceRowPlaceholder}
      />
    </section>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Transaction history (TransactionRow)</h3>
      <GenericList
        store={transactionStore}
        row={TransactionRow}
        rowHeight={64}
        expectedPageSize={3}
        maxPlaceholderPages={1}
        placeholderRow={TransactionRowPlaceholder}
        getKey={(item) => `${item.timestamp ?? '0'}-${item.from ?? ''}-${item.to ?? ''}`}
      />
    </section>

    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Groups list (GroupRowView)</h3>
      <GenericList
        store={groupsStore}
        row={GroupRowView}
        rowHeight={64}
        expectedPageSize={4}
        maxPlaceholderPages={1}
        placeholderRow={AvatarRowPlaceholder}
        getKey={(item) => String(item.group)}
      />
    </section>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Sales orders (SalesOrderRow)</h3>
      <GenericList
        store={salesOrderStore}
        row={SalesOrderRow}
        rowHeight={64}
        expectedPageSize={3}
        maxPlaceholderPages={1}
        placeholderRow={MarketOrderRowPlaceholder}
        getKey={(item) => item.key ?? item.orderNumber}
      />
    </section>

    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Avatar search dev list (AvatarSearchRow)</h3>
      <ListShell query={avatarSearchQuery} searchPlaceholder="Search avatar results" wrapInListContainer={false}>
        <GenericList
          store={avatarSearchPaginated}
          row={AvatarSearchRow}
          rowHeight={64}
          expectedPageSize={5}
          maxPlaceholderPages={1}
          placeholderRow={AvatarRowPlaceholder}
        />
      </ListShell>
    </section>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Gateway trusted accounts (TrustRow)</h3>
      <GatewayTrustedAccountsList rows={gatewayTrustedRows} />
    </section>

    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Payment gateways (GatewayRow)</h3>
      <GenericList
        store={gatewayStore}
        row={GatewayRowView}
        rowHeight={64}
        expectedPageSize={2}
        maxPlaceholderPages={1}
        placeholderRow={GatewayRowPlaceholder}
      />
    </section>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Holders list (HoldersRow)</h3>
      <GenericList
        store={holderStore}
        row={HoldersRow}
        rowHeight={64}
        expectedPageSize={2}
        maxPlaceholderPages={1}
        placeholderRow={AvatarRowPlaceholder}
        getKey={(item) => String(item.avatar)}
      />
    </section>

    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Trust relations (SearchablePaginatedAddressList)</h3>
      <SearchablePaginatedAddressList addresses={trustRelationsStore} emptyLabel="No trust relations" />
    </section>
  </div>

  <section class="rounded-xl border border-base-300 p-3 space-y-2">
    <h3 class="font-medium">RPC avatar search list (SearchAvatar)</h3>
    <SearchAvatar searchType="contact" />
  </section>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Admin catalog selection (AdminProductRow)</h3>
      <AdminProductRow product={adminCatalogRow} productType={adminCatalogType} />
    </section>

    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Admin grouped product list (AdminProductList)</h3>
      <AdminProductList products={adminProducts} connections={adminConnections} />
    </section>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Event history monthly list (EventHistoryMonthlyList)</h3>
      <EventHistoryMonthlyList monthlyItems={monthlyItems} maxBucketCount={6} rangeEvents={rangeEvents} />
    </section>

    <section class="rounded-xl border border-base-300 p-3 space-y-2">
      <h3 class="font-medium">Transaction event table (TxEvents)</h3>
      <TxEvents
        events={txEvents}
        eventDisplayEntries={eventDisplayEntries}
        niceKey={niceKey}
        isOpen={isOpen}
        toggleOpen={toggleOpen}
        eventsListOpen={eventsListOpen}
        toggleEventsList={toggleEventsList}
      />
    </section>
  </div>

</section>

