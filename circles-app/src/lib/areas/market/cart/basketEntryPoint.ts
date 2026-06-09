import { writable, type Readable, type Unsubscriber } from 'svelte/store';
import { openFlowPopup } from '$lib/shared/state/popup';

const localCount = writable(0);
let unsub: Unsubscriber | null = null;
let subscribePromise: Promise<void> | null = null;

export const basketCount: Readable<number> = localCount;

export async function ensureBasketCountSubscription(): Promise<void> {
  if (unsub) return;
  if (subscribePromise) { await subscribePromise; return; }
  subscribePromise = (async () => {
    const { cartItemCount } = await import('./store');
    if (!unsub) {
      unsub = cartItemCount.subscribe((v) => localCount.set(v));
    }
  })();
  await subscribePromise;
}

export async function openBasketPopup(): Promise<void> {
  const [{ default: CartPanel }] = await Promise.all([
    import('$lib/areas/market/flows/checkout/CartPanel.svelte'),
    ensureBasketCountSubscription(),
  ]);

  openFlowPopup({
    title: 'Basket',
    component: CartPanel,
    props: { catalog: [] },
  });
}
