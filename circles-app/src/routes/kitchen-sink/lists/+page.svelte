<script lang="ts">
  import { writable, type Readable } from 'svelte/store';

  import GenericList from '$lib/components/GenericList.svelte';
  import BalanceRowSkeleton from '$lib/components/BalanceRowSkeleton.svelte';
  import DemoGenericRow from '../DemoGenericRow.svelte';

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
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">Lists & Loading</h2>

  <div class="space-y-2">
    <h3 class="font-medium">Skeleton states</h3>
    <div class="space-y-2">
      <BalanceRowSkeleton />
      <BalanceRowSkeleton height={56} />
    </div>
  </div>

  <div class="space-y-2">
    <h3 class="font-medium">GenericList with paged loading</h3>
    <p class="text-sm opacity-70">Scroll list: additional rows are loaded via the demo store.</p>
    <div class="max-h-80 overflow-auto rounded-lg border border-base-300 p-2">
      <GenericList
        store={demoListStore}
        row={DemoGenericRow}
        getKey={(item) => item.id}
        rowHeight={56}
        expectedPageSize={3}
        maxPlaceholderPages={1}
      />
    </div>
  </div>
</section>
