import type { Readable } from 'svelte/store';
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

export function createPagedListStore<T>(options: {
  pageSize: number;
  loadPage: (page: number, pageSize: number) => Promise<T[]>;
  isEnded?: (items: T[], pageSize: number) => boolean;
}): Readable<{ data: T[]; next: () => Promise<boolean>; ended: boolean }> {
  type State = {
    data: T[];
    ended: boolean;
    next: () => Promise<boolean>;
    page: number;
    loading: boolean;
  };
  const subscribers = new Set<(v: State) => void>();
  const notify = (v: State) => subscribers.forEach((fn) => fn(v));

  let state: State = {
    data: [],
    ended: false,
    page: 0,
    loading: false,
    next: async () => {
      if (state.loading || state.ended) return true;
      state = { ...state, loading: true };
      notify(state);
      try {
        const nextPage = state.page + 1;
        const items = await options.loadPage(nextPage, options.pageSize);
        const data = state.data.concat(items ?? []);
        const ended = options.isEnded
          ? options.isEnded(items ?? [], options.pageSize)
          : (items ?? []).length === 0;
        state = { ...state, data, page: nextPage, ended, loading: false };
        notify(state);
        return ended;
      } catch {
        state = { ...state, ended: true, loading: false };
        notify(state);
        return true;
      }
    },
  };

  return {
    subscribe(run: (v: State) => void) {
      subscribers.add(run);
      run(state);
      return () => {
        subscribers.delete(run);
      };
    },
  } as any;
}

export function createBuyerOrdersStore(options?: {
  pageSize?: number;
  terminalStatuses?: string[];
  onOrderUpdatedWithOutbox?: (snapshot: OrderSnapshot) => void;
}): Readable<{ data: MarketOrderSummaryListItem[]; next: () => Promise<boolean>; ended: boolean }> {
  const pageSize = options?.pageSize ?? 50;
  const terminalStatuses = new Set(
    options?.terminalStatuses ?? [
      'https://schema.org/PaymentComplete',
      'https://schema.org/OrderDelivered',
    ]
  );

  type State = {
    data: MarketOrderSummaryListItem[];
    ended: boolean;
    next: () => Promise<boolean>;
    page: number;
    loading: boolean;
  };

  const subscribers = new Set<(v: State) => void>();
  const notify = (v: State) => subscribers.forEach((fn) => fn(v));
  let stopSse: (() => void) | null = null;

  let state: State = {
    data: [],
    ended: false,
    page: 0,
    loading: false,
    next: async () => {
      if (state.loading || state.ended) return true;
      state = { ...state, loading: true };
      notify(state);
      try {
        const nextPage = state.page + 1;
        const resp = await getOrdersByBuyer(nextPage, pageSize);
        const items = Array.isArray(resp?.items) ? resp.items : [];
        const data = state.data.concat(mapMarketOrderSummaries(items));
        const ended = items.length === 0;
        state = { ...state, data, page: nextPage, ended, loading: false };
        notify(state);
        return true;
      } catch {
        state = { ...state, ended: true, loading: false };
        notify(state);
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
        notify(state);
      }

      if (!terminalStatuses.has(evt.newStatus)) return;

      try {
        const snap = await getOrder(evt.orderId);
        const idx2 = state.data.findIndex((it) => it.key === evt.orderId);
        if (idx2 >= 0) {
          const total = (snap as any)?.totalPaymentDue ?? state.data[idx2].total ?? null;
          const next = {
            ...state.data[idx2],
            status: (snap as any)?.orderStatus ?? evt.newStatus,
            total,
            snapshot: snap,
          };
          const arr = state.data.slice();
          arr[idx2] = next;
          state = { ...state, data: arr };
          notify(state);
        }

        const outbox = (snap as any)?.outbox;
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
    subscribe(run: (v: State) => void) {
      subscribers.add(run);
      if (subscribers.size === 1) ensureSse();
      run(state);
      return () => {
        subscribers.delete(run);
        stopSseIfIdle();
      };
    },
  } as any;
}
