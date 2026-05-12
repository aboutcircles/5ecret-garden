<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import { EventHistoryHeatmap, type EventHistoryDataSource } from '$lib/shared/ui/event-history';
  import type { CirclesBaseEventRow, EventHistoryRowComponent, EventHistoryDayPopupHeaderComponent } from '$lib/shared/ui/event-history/types';
  import TrustHistoryDayEventRow from '$lib/areas/trust/ui/history/TrustHistoryDayEventRow.svelte';
  import TrustHistoryDayPopupHeader from '$lib/areas/trust/ui/history/TrustHistoryDayPopupHeader.svelte';
  import { trustHistoryKnownRangeEvents } from '$lib/areas/trust/ui/history/knownRangeEvents';
  import type {
    Granularity,
    TrustHistoryEventRow,
    TrustHistoryRangeEvent,
  } from '$lib/areas/trust/ui/history/types';

  interface Props {
    address?: Address;
    granularity?: Granularity;
    showGranularitySwitch?: boolean;
    eventCount?: number;
  }

  let {
    address,
    granularity = 'month',
    showGranularitySwitch = true,
    eventCount = $bindable(0),
  }: Props = $props();

  const knownRangeEvents = $derived(buildKnownRangeEvents());
  const dataSource = $derived(buildDataSource(address));

  function buildDataSource(addr?: Address): EventHistoryDataSource<TrustHistoryEventRow> {
    return {
      namespace: 'CrcV2',
      table: 'Trust',
      columns: [],
      sortOrder: 'ASC',
      pageSize: 1000,
      baseFilter: addr
        ? [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'truster',
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

  function parseDateToDayStartSec(dateString: string): number | null {
    const d = new Date(`${dateString}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  }

  function buildKnownRangeEvents(): TrustHistoryRangeEvent[] {
    const mapped: Array<TrustHistoryRangeEvent | null> = trustHistoryKnownRangeEvents.events
      .map((event) => {
        const startDaySec = parseDateToDayStartSec(event.startDate);
        const endDaySec = parseDateToDayStartSec(event.endDate);
        if (startDaySec === null || endDaySec === null) return null;

        const eventTypeLabel = event.eventType
          ? trustHistoryKnownRangeEvents.taxonomies?.eventType?.[event.eventType]?.label
          : undefined;
        const seriesLabel = event.seriesId
          ? trustHistoryKnownRangeEvents.taxonomies?.series?.[event.seriesId]?.label
          : undefined;

        const locationParts = [event.location?.city ?? null, event.location?.country ?? null].filter(
          (v): v is string => Boolean(v)
        );
        const locationLabel =
          locationParts.length > 0
            ? locationParts.join(', ')
            : event.location?.mode === 'online'
              ? 'Online'
              : event.location?.mode === 'hybrid'
                ? 'Hybrid'
                : undefined;

        const descriptionParts = [seriesLabel, eventTypeLabel, locationLabel].filter(
          (v): v is string => Boolean(v)
        );

        const normalizedStart = Math.min(startDaySec, endDaySec);
        const normalizedEnd = Math.max(startDaySec, endDaySec);

        return {
          id: event.id,
          title: event.title ?? event.name ?? event.id,
          description: event.description ?? (descriptionParts.length > 0 ? descriptionParts.join(' · ') : undefined),
          startDaySec: normalizedStart,
          endDaySec: normalizedEnd,
        };
      });

    return mapped
      .filter((event): event is TrustHistoryRangeEvent => event !== null)
      .sort((a, b) => a.startDaySec - b.startDaySec || a.endDaySec - b.endDaySec || a.title.localeCompare(b.title));
  }

  function trustSearchHaystack(row: CirclesBaseEventRow): string {
    const r = row as TrustHistoryEventRow;
    return [
      String(r.trustee ?? ''),
      String(r.transactionHash ?? ''),
      Number(r.expiryTime) > Number(r.timestamp) ? 'trust set' : 'trust removed',
    ]
      .join(' ')
      .toLowerCase();
  }
</script>

<EventHistoryHeatmap
  dataSource={dataSource as EventHistoryDataSource}
  labels={{
    title: 'Trust events',
    loading: 'Loading outgoing trust history…',
    empty: 'No outgoing trust events found.',
    searchPlaceholder: 'Search trustees, tx hash, or event type',
    dayEmpty: 'No trust events in this day.',
    summary: (rows) => {
      const trustRows = rows as TrustHistoryEventRow[];
      const setCount = trustRows.filter((row) => toNumber(row.expiryTime) > toNumber(row.timestamp)).length;
      const removedCount = trustRows.length - setCount;
      return `${trustRows.length} outgoing trust events · ${setCount} set · ${removedCount} removed`;
    },
  }}
  searchHaystack={trustSearchHaystack}
  rowComponent={TrustHistoryDayEventRow as EventHistoryRowComponent}
  dayPopupHeaderComponent={TrustHistoryDayPopupHeader as EventHistoryDayPopupHeaderComponent}
  overlays={{
    rangeEvents: knownRangeEvents,
    overlayLabel: 'Known events',
    overlaySearchPlaceholder: 'Filter events by name, series, type, location',
  }}
  {granularity}
  {showGranularitySwitch}
  bind:eventCount
/>
