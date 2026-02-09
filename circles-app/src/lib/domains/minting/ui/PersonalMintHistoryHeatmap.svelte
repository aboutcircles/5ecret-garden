<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { EventHistoryHeatmap, type EventHistoryDataSource } from '$lib/domains/events/ui';
  import PersonalMintDayEventRow from '$lib/domains/minting/ui/history/PersonalMintDayEventRow.svelte';

  type PersonalMintEventRow = {
    blockNumber: number;
    timestamp?: number;
    transactionIndex: number;
    logIndex: number;
    transactionHash?: string;
    human?: string;
    amount?: number | string;
    startPeriod?: number | string;
    endPeriod?: number | string;
  };

  interface Props {
    address?: Address;
    eventCount?: number;
  }

  let { address, eventCount = $bindable(0) }: Props = $props();

  const dataSource = $derived(buildDataSource(address));

  function buildDataSource(addr?: Address): EventHistoryDataSource<PersonalMintEventRow> {
    return {
      namespace: 'CrcV2',
      table: 'PersonalMint',
      columns: [],
      sortOrder: 'ASC',
      pageSize: 1000,
      baseFilter: addr
        ? [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'human',
              Value: addr.toLowerCase(),
            },
          ]
        : [],
      getTimestampSec: (row) => toNumber(row.timestamp),
    };
  }

  function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    return 0;
  }

  function formatAmount(value: number | string | undefined): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return String(value ?? '0');
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function toBigIntAmount(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return 0n;
      return BigInt(Math.trunc(value));
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^-?\d+$/.test(trimmed)) {
        return BigInt(trimmed);
      }
      return 0n;
    }
    return 0n;
  }

  function formatWeiAsCircles(value: bigint): string {
    const sign = value < 0n ? '-' : '';
    const abs = value < 0n ? -value : value;
    const base = 1_000_000_000_000_000_000n; // 1e18
    const whole = abs / base;
    const frac2 = (abs % base) * 100n / base;
    return `${sign}${whole.toLocaleString()}.${frac2.toString().padStart(2, '0')}`;
  }

  function mintSearchHaystack(row: PersonalMintEventRow): string {
    return [
      String(row.human ?? ''),
      String(row.transactionHash ?? ''),
      String(row.amount ?? ''),
      String(row.startPeriod ?? ''),
      String(row.endPeriod ?? ''),
      'personal mint',
    ]
      .join(' ')
      .toLowerCase();
  }
</script>

<EventHistoryHeatmap
  {dataSource}
  labels={{
    title: 'Minting events',
    loading: 'Loading minting history…',
    empty: 'No personal mint events found.',
    searchPlaceholder: 'Search amount, tx hash, or minter',
    dayEmpty: 'No mint events in this day.',
    summary: (rows) => {
      const mintRows = rows as PersonalMintEventRow[];
      const totalMintedWei = mintRows.reduce((sum, row) => sum + toBigIntAmount(row.amount), 0n);
      return `${mintRows.length} mint event${mintRows.length === 1 ? '' : 's'} · ${formatWeiAsCircles(totalMintedWei)} total minted`;
    },
  }}
  searchHaystack={mintSearchHaystack}
  rowComponent={PersonalMintDayEventRow as any}
  granularity="month"
  showGranularitySwitch={true}
  bind:eventCount
/>
