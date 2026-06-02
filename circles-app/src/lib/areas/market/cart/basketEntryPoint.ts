import { writable, type Readable, type Unsubscriber } from 'svelte/store';
import { openFlowPopup } from '$lib/shared/state/popup';

const localCount = writable(0);
let unsub: Unsubscriber | null = null;

export const basketCount: Readable<number> = localCount;

export async function ensureBasketCountSubscription(): Promise<void> {
  if (unsub) return;
  const { cartItemCount } = await import('./store');
  unsub = cartItemCount.subscribe((v) => localCount.set(v));
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
