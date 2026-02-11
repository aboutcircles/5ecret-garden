export type Granularity = 'day' | 'week' | 'month';

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

export type TrustHistoryEventRow = {
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  timestamp: number;
  transactionHash?: string;
  version?: number;
  truster: string;
  trustee: string;
  expiryTime: number;
  limit?: number;
};

export type TrustHistoryTxGroupHeaderItem = {
  kind: 'group';
  key: string;
  transactionHash?: string;
  blockNumber: number;
  transactionIndex: number;
  count: number;
};

export type TrustHistoryTxEventItem = {
  kind: 'event';
  key: string;
  row: TrustHistoryEventRow;
};

export type TrustHistoryListItem = TrustHistoryTxGroupHeaderItem | TrustHistoryTxEventItem;

export type TrustHistoryRangeEventConfig = {
  id: string;
  title?: string;
  name?: string;
  startDate: string;
  endDate: string;
  description?: string;
  eventType?: string;
  seriesId?: string;
  location?: {
    mode?: 'online' | 'in_person' | 'hybrid' | string;
    city?: string | null;
    country?: string | null;
  };
  tags?: string[];
  links?: Array<{ label: string; url: string }>;
};

export type TrustHistoryKnownEventsDataset = {
  schemaVersion: string;
  generatedAt: string;
  taxonomies?: {
    eventType?: Record<string, { label: string; description?: string }>;
    series?: Record<string, { label: string; description?: string }>;
  };
  events: TrustHistoryRangeEventConfig[];
  omissions?: Array<{ scope: string; note: string }>;
};

export type TrustHistoryRangeEvent = {
  id: string;
  title: string;
  description?: string;
  startDaySec: number;
  endDaySec: number;
};
