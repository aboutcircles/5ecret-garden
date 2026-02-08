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
