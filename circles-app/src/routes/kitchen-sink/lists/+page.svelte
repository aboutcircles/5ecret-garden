<script lang="ts">
  import { derived, writable, type Readable } from 'svelte/store';

  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import BalanceRowSkeleton from '$lib/areas/wallet/ui/components/BalanceRowSkeleton.svelte';
  import DemoGenericRow from '../DemoGenericRow.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
  import { T } from '$lib/design-system/tokens';

  type DemoItem = {
    id: string;
    title: string;
    subtitle: string;
    amount: string;
  };

  const seedItems: DemoItem[] = [
    { id: 'i-1', title: 'Alpha', subtitle: 'Seed item', amount: '12.34 CRC' },
    { id: 'i-2', title: 'Beta', subtitle: 'Seed item', amount: '8.10 CRC' },
    { id: 'i-3', title: 'Gamma', subtitle: 'Seed item', amount: '4.01 CRC' },
    { id: 'i-4', title: 'Delta', subtitle: 'Loaded page 2', amount: '0.55 CRC' },
    { id: 'i-5', title: 'Epsilon', subtitle: 'Loaded page 2', amount: '1.03 CRC' },
    { id: 'i-6', title: 'Zeta', subtitle: 'Loaded page 2', amount: '99.99 CRC' },
    { id: 'i-7', title: 'Eta', subtitle: 'Loaded page 3', amount: '3.14 CRC' },
    { id: 'i-8', title: 'Theta', subtitle: 'Loaded page 3', amount: '2.71 CRC' },
    { id: 'i-9', title: 'Iota', subtitle: 'Loaded page 3', amount: '42.00 CRC' }
  ];

  const pageSize = 3;
  let loadedCount = $state(pageSize);

  type DemoListStore = {
    data: DemoItem[];
    next: () => Promise<boolean>;
    ended: boolean;
  };

  const listNext = async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    loadedCount = Math.min(seedItems.length, loadedCount + pageSize);
    const ended = loadedCount >= seedItems.length;
    listInner.set({
      data: seedItems.slice(0, loadedCount),
      ended,
      next: listNext
    });
    return true;
  };

  const listInner = writable<DemoListStore>({
    data: seedItems.slice(0, pageSize),
    ended: false,
    next: listNext
  });

  const demoListStore: Readable<DemoListStore> = { subscribe: listInner.subscribe };
  const query = writable('');
  let demoListScopeEl: HTMLDivElement | null = $state(null);

  const filteredDemoListStore = derived([demoListStore, query], ([$store, $query]) => {
    const q = ($query ?? '').toLowerCase().trim();
    if (!q) return $store;

    return {
      ...$store,
      data: ($store?.data ?? []).filter((item) => {
        const title = String(item.title ?? '').toLowerCase();
        const subtitle = String(item.subtitle ?? '').toLowerCase();
        return title.includes(q) || subtitle.includes(q);
      })
    };
  });

  const onSearchInputKeydown = createListInputArrowDownHandler({
    getScope: () => demoListScopeEl,
    rowSelector: '[data-demo-generic-row]'
  });
</script>

<section style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:16px;">
  <h2 style="font-size:16px;font-weight:580;margin:0;">Lists & Loading</h2>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">Skeleton states</h3>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <BalanceRowSkeleton />
      <BalanceRowSkeleton height={56} />
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:8px;">
    <h3 style="font-size:13px;font-weight:500;margin:0;">GenericList with paged loading</h3>
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">Scroll list: additional rows are loaded via the demo store.</p>
    <div style="max-height:320px;overflow:auto;border-radius:8px;border:1px solid {T.hairlineSoft};padding:8px;" data-demo-list-scope bind:this={demoListScopeEl}>
      <ListShell
        query={query}
        searchPlaceholder="Search demo rows"
        inputDataAttribute="data-demo-list-search-input"
        onInputKeydown={onSearchInputKeydown}
        isEmpty={$demoListStore.data.length === 0}
        ended={$demoListStore.ended}
        emptyRequiresEnd={true}
        isNoMatches={$demoListStore.data.length > 0 && $filteredDemoListStore.data.length === 0}
        emptyLabel="No demo rows"
        noMatchesLabel="No matching demo rows"
        wrapInListContainer={false}
      >
        <GenericList
          store={filteredDemoListStore}
          row={DemoGenericRow}
          getKey={(item) => item.id}
          rowHeight={56}
          expectedPageSize={3}
          maxPlaceholderPages={1}
        />
      </ListShell>
    </div>
  </div>
</section>
