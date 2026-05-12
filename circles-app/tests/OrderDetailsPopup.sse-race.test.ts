// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';

const getOrderStatusHistoryMock = vi.fn();
const subscribeBuyerOrderEventsMock = vi.fn();
const getOrderMock = vi.fn();

vi.mock('../src/lib/areas/market/orders/ordersQueries', () => ({
  getOrderStatusHistory: getOrderStatusHistoryMock,
  subscribeBuyerOrderEvents: subscribeBuyerOrderEventsMock,
  getOrder: getOrderMock,
}));

import OrderDetailsPopup from '../src/lib/areas/market/orders/OrderDetailsPopup.svelte';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('OrderDetailsPopup SSE subscription lifecycle', () => {
  it('unsubscribes if destroyed before history load resolves (prevents leaked duplicate SSE listeners)', async () => {
    const historyDeferred = deferred<{ events: any[] }>();
    const unsubscribe = vi.fn();

    getOrderStatusHistoryMock.mockReturnValueOnce(historyDeferred.promise);
    subscribeBuyerOrderEventsMock.mockReturnValueOnce(unsubscribe);
    getOrderMock.mockResolvedValue(null);

    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(OrderDetailsPopup, {
      target,
      props: {
        mode: 'buyer',
        snapshot: { orderNumber: 'ORDER-1' },
        showHistory: true,
        showAdvanced: false,
      },
    });

    // Close/destroy quickly before history request resolves.
    unmount(component);

    // Late resolution should not leave an active subscription behind.
    historyDeferred.resolve({ events: [] });
    await tick();

    expect(subscribeBuyerOrderEventsMock).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    target.remove();
  });
});
