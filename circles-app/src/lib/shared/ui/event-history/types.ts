import type { Component } from 'svelte';

export type Granularity = 'day' | 'week' | 'month';

export type CirclesBaseEventRow = {
  $event?: string;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  timestamp?: number;
  transactionHash?: string;
};

export type CirclesQueryFilter =
  | {
      Type: 'FilterPredicate';
      FilterType:
        | 'Equals'
        | 'NotEquals'
        | 'GreaterThan'
        | 'GreaterThanOrEquals'
        | 'LessThan'
        | 'LessThanOrEquals'
        | 'Like'
        | 'ILike'
        | 'NotLike'
        | 'In'
        | 'NotIn'
        | 'IsNotNull'
        | 'IsNull';
      Column: string;
      Value: any;
    }
  | { Type: 'FilterGroup'; Operator: 'AND' | 'OR'; Filters: CirclesQueryFilter[] };

export type EventHistoryDataSource<Row extends CirclesBaseEventRow = CirclesBaseEventRow> = {
  namespace: string;
  table: string;
  columns?: string[];
  sortOrder?: 'ASC' | 'DESC';
  pageSize?: number;
  baseFilter?: CirclesQueryFilter[];
  getTimestampSec?: (row: Row) => number;
};

export type EventHistoryLabels<Row extends CirclesBaseEventRow = CirclesBaseEventRow> = {
  title?: string;
  loading?: string;
  empty?: string;
  summary?: (rows: Row[]) => string;
  dayPopupTitle?: (dayStartSec: number, events: Row[]) => string;
  searchPlaceholder?: string;
  histogramTitle?: string;
  dayEmpty?: string;
  dayNoMatches?: string;
};

export type RangeOverlayEvent = {
  id: string;
  title: string;
  description?: string;
  startDaySec: number;
  endDaySec: number;
};

export type EventHistoryOverlays = {
  rangeEvents?: RangeOverlayEvent[];
  overlayLabel?: string;
  overlaySearchPlaceholder?: string;
};

export type CalendarCell = {
  tsSec: number;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  count: number;
};

export type MonthCalendar = {
  key: string;
  label: string;
  weeks: CalendarCell[][];
};

export type WeeklyBucket = {
  startSec: number;
  count: number;
};

export type MonthWeeklySection = {
  key: string;
  label: string;
  weeks: WeeklyBucket[];
};

export type MonthlyItem = {
  startSec: number;
  label: string;
  count: number;
};

export type EventHistoryTxGroupHeaderItem = {
  kind: 'group';
  key: string;
  transactionHash?: string;
  blockNumber: number;
  transactionIndex: number;
  count: number;
};

export type EventHistoryTxEventItem<Row extends CirclesBaseEventRow = CirclesBaseEventRow> = {
  kind: 'event';
  key: string;
  row: Row;
};

export type EventHistoryListItem<Row extends CirclesBaseEventRow = CirclesBaseEventRow> =
  | EventHistoryTxGroupHeaderItem
  | EventHistoryTxEventItem<Row>;

export type EventHistoryRowComponent<Row extends CirclesBaseEventRow = CirclesBaseEventRow> = Component<{
  item: EventHistoryListItem<Row>;
}>;

export type EventHistoryDayPopupHeaderComponent<Row extends CirclesBaseEventRow = CirclesBaseEventRow> = Component<{
  dayStartSec: number;
  dayEndSec: number;
  events: Row[];
}>;