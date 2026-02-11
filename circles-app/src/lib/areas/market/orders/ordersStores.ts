import type { PaginatedReadable } from '$lib/shared/state/paginatedList';
import type { OrderSnapshot } from '@circles-market/sdk';
import type { OrderStatusSseEvent } from '$lib/areas/market/orders/types';
import {
  getOrder,
  getOrdersByBuyer,
  subscribeBuyerOrderEvents,
} from '$lib/areas/market/orders/ordersQueries';
import {
  mapMarketOrderSummaries,
  type MarketOrderSummaryListItem,
} from '$lib/areas/market/orders/ordersMappers';

type ListValue<T> = { data: T[]; next: () => Promise<boolean>; ended: boolean };
type InternalListState<T> = ListValue<T> & { page: number; loading: boolean };

type SnapshotSummaryFields = {
  totalPaymentDue?: { price?: number | null; priceCurrency?: string | null } | null;
  orderStatus?: string;
  outbox?: unknown[];
};

function toPublicListValue<T>(state: InternalListState<T>): ListValue<T> {
  return {
    data: state.data,
    next: state.next,
    ended: state.ended,
  };
}

export function createPagedListStore<T>(options: {
  pageSize: number;
  loadPage: (page: number, pageSize: number) => Promise<T[]>;
  isEnded?: (items: T[], pageSize: number) => boolean;
}): PaginatedReadable<T> {
  const subscribers = new Set<(v: ListValue<T>) => void>();
  const notify = () => {
    const value = toPublicListValue(state);
    subscribers.forEach((fn) => fn(value));
  };

  let state: InternalListState<T> = {
    data: [],
    ended: false,
    page: 0,
    loading: false,
    next: async () => {
      if (state.loading || state.ended) return true;
      state = { ...state, loading: true };
      notify();
      try {
        const nextPage = state.page + 1;
        const items = await options.loadPage(nextPage, options.pageSize);
        const data = state.data.concat(items ?? []);
        const ended = options.isEnded
          ? options.isEnded(items ?? [], options.pageSize)
          : (items ?? []).length === 0;
        state = { ...state, data, page: nextPage, ended, loading: false };
        notify();
        return ended;
      } catch {
        state = { ...state, ended: true, loading: false };
        notify();
        return true;
      }
    },
  };

  return {
    subscribe(run: (v: ListValue<T>) => void) {
      subscribers.add(run);
      run(toPublicListValue(state));
      return () => {
        subscribers.delete(run);
      };
    },
  };
}

export function createBuyerOrdersStore(options?: {
  pageSize?: number;
  terminalStatuses?: string[];
  onOrderUpdatedWithOutbox?: (snapshot: OrderSnapshot) => void;
}): PaginatedReadable<MarketOrderSummaryListItem> {
  const pageSize = options?.pageSize ?? 50;
  const terminalStatuses = new Set(
    options?.terminalStatuses ?? [
      'https://schema.org/PaymentComplete',
      'https://schema.org/OrderDelivered',
    ]
  );

  const subscribers = new Set<(v: ListValue<MarketOrderSummaryListItem>) => void>();
  const notify = () => {
    const value = toPublicListValue(state);
    subscribers.forEach((fn) => fn(value));
  };
  let stopSse: (() => void) | null = null;

  let state: InternalListState<MarketOrderSummaryListItem> = {
    data: [],
    ended: false,
    page: 0,
    loading: false,
    next: async () => {
      if (state.loading || state.ended) return true;
      state = { ...state, loading: true };
      notify();
      try {
        const nextPage = state.page + 1;
        const resp = await getOrdersByBuyer(nextPage, pageSize);
        const items = Array.isArray(resp?.items) ? resp.items : [];
        const data = state.data.concat(mapMarketOrderSummaries(items));
        const ended = items.length === 0;
        state = { ...state, data, page: nextPage, ended, loading: false };
        notify();
        return true;
      } catch {
        state = { ...state, ended: true, loading: false };
        notify();
        return true;
      }
    },
  };

  function ensureSse() {
    if (stopSse) return;

    stopSse = subscribeBuyerOrderEvents(async (evt: OrderStatusSseEvent) => {
      if (!evt || typeof evt.orderId !== 'string') return;

      const idx = state.data.findIndex((it) => it.key === evt.orderId);
      if (idx >= 0) {
        const cur = state.data[idx];
        const updated = { ...cur, status: evt.newStatus };
        const nextData = state.data.slice();
        nextData[idx] = updated;
        state = { ...state, data: nextData };
        notify();
      }

      if (!terminalStatuses.has(evt.newStatus)) return;

      try {
        const snap = await getOrder(evt.orderId);
        const snapFields = snap as OrderSnapshot & SnapshotSummaryFields;
        const idx2 = state.data.findIndex((it) => it.key === evt.orderId);
        if (idx2 >= 0) {
          const total = snapFields.totalPaymentDue ?? state.data[idx2].total ?? null;
          const next = {
            ...state.data[idx2],
            status: snapFields.orderStatus ?? evt.newStatus,
            total,
            snapshot: snap,
          };
          const arr = state.data.slice();
          arr[idx2] = next;
          state = { ...state, data: arr };
          notify();
        }

        const outbox = snapFields.outbox;
        if (Array.isArray(outbox) && outbox.length > 0) {
          options?.onOrderUpdatedWithOutbox?.(snap);
        }
      } catch {
        // ignore fetch errors
      }
    });
  }

  function stopSseIfIdle() {
    if (subscribers.size === 0 && stopSse) {
      try {
        stopSse();
      } catch {}
      stopSse = null;
    }
  }

  return {
    subscribe(run: (v: ListValue<MarketOrderSummaryListItem>) => void) {
      subscribers.add(run);
      if (subscribers.size === 1) ensureSse();
      run(toPublicListValue(state));
      return () => {
        subscribers.delete(run);
        stopSseIfIdle();
      };
    },
  };
}
