import { get, writable } from 'svelte/store';
import type { Avatar } from '@aboutcircles/sdk';
import { circles } from '$lib/shared/state/circles';
import {
  fetchPaymentsByPayer,
  type PaymentRow,
} from '$lib/shared/data/circles/paymentReceived';

/**
 * Marketplace / payment-gateway SPENDING (buyer side).
 *
 * One avatar-scoped fetch of every `PaymentReceived` event where the active avatar is the
 * `payer`, shared by two consumers:
 *   - DashboardSpendingCard — time-horizon spend totals.
 *   - TransactionRow — labels a gateway payment "Marketplace" and shows the SELLER (payee)
 *     instead of the faceless gateway/sink the CRC technically routed through.
 *
 * `byTxHash` keys the payments by (lowercase) transaction hash so the row can correlate an
 * aggregated history entry to its underlying gateway payment in O(1). `loaded`/`error`
 * distinguish "still fetching" from "fetched, genuinely no spend" (same lesson as the
 * contacts store — never infer loading from an empty list).
 */
export interface GatewaySpendingState {
  payments: PaymentRow[];
  byTxHash: Map<string, PaymentRow>;
  loaded: boolean;
  error: boolean;
}

function emptyState(): GatewaySpendingState {
  return { payments: [], byTxHash: new Map(), loaded: false, error: false };
}

export const gatewaySpending = writable<GatewaySpendingState>(emptyState());

let currentAddress = '';
let inflight = 0;

/**
 * Initialise the gateway-spending store for an avatar. Dedup-guarded per address (a no-op
 * when already loaded for the same avatar), mirroring the other avatar stores.
 */
export function initGatewaySpendingStore(avatar: Avatar): void {
  const address = avatar?.address?.toLowerCase();
  if (!address) return;
  if (address === currentAddress) return;
  void loadGatewaySpending(address);
}

/** Force a reload past the dedup guard (e.g. after a marketplace purchase). */
export function refreshGatewaySpendingStore(avatar: Avatar): void {
  const address = avatar?.address?.toLowerCase();
  if (!address) return;
  currentAddress = '';
  void loadGatewaySpending(address);
}

async function loadGatewaySpending(address: string): Promise<void> {
  currentAddress = address;
  const sdk = get(circles);
  if (!sdk) {
    // No SDK yet. initAvatarStores fires once per avatar, so it won't retry on its own.
    // Keep `currentAddress = address` (so a duplicate init still dedups and we don't stack
    // subscribers) and reload once the SDK lands. Unsubscribe on the first truthy value
    // either way, so an avatar-switch before the SDK arrives can't leak this listener — the
    // `currentAddress === wanted` check makes the late callback a no-op in that case.
    const wanted = address;
    const unsub = circles.subscribe((s) => {
      if (!s) return;
      unsub();
      if (currentAddress === wanted) void loadGatewaySpending(wanted);
    });
    return;
  }

  // Reset to a loading state for the new avatar so a stale list can't show through.
  gatewaySpending.set(emptyState());
  const ticket = ++inflight;

  try {
    const payments = await fetchPaymentsByPayer(sdk, address);
    // Ignore a result that arrived after a newer avatar load started.
    if (ticket !== inflight) return;
    const byTxHash = new Map<string, PaymentRow>();
    for (const p of payments) {
      const key = p.tx?.toLowerCase();
      if (key && !byTxHash.has(key)) byTxHash.set(key, p);
    }
    gatewaySpending.set({ payments, byTxHash, loaded: true, error: false });
  } catch (e) {
    if (ticket !== inflight) return;
    console.warn('[gatewaySpending] failed to load payer payments', e);
    gatewaySpending.set({ payments: [], byTxHash: new Map(), loaded: true, error: true });
  }
}

/** Clear on logout so the next session starts clean. */
export function clearGatewaySpendingStore(): void {
  currentAddress = '';
  inflight++;
  gatewaySpending.set(emptyState());
}

// --- spend summaries -------------------------------------------------------------------------

const DAY_SECONDS = 86_400;

export type SpendWindow = '7d' | '30d' | 'all';

export interface SpendWindowSummary {
  /** CRC spent in the window. */
  total: number;
  /** Number of gateway payments in the window. */
  count: number;
}

/** wei (18 decimals) bigint → CRC number. Safe for typical payment magnitudes. */
function weiToCrc(amount: bigint): number {
  // Divide in float space; payment amounts are far below Number.MAX_SAFE_INTEGER once
  // scaled down, so this is precise enough for display totals.
  return Number(amount) / 1e18;
}

function windowStartSeconds(window: SpendWindow, nowSeconds: number): number {
  switch (window) {
    case '7d':
      return nowSeconds - 7 * DAY_SECONDS;
    case '30d':
      return nowSeconds - 30 * DAY_SECONDS;
    case 'all':
    default:
      return 0;
  }
}

/** Total CRC + count of gateway payments within a single window. */
export function summarizeSpend(
  payments: PaymentRow[],
  window: SpendWindow,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): SpendWindowSummary {
  const start = windowStartSeconds(window, nowSeconds);
  let total = 0;
  let count = 0;
  for (const p of payments) {
    if (p.timestamp < start) continue;
    total += weiToCrc(p.amount);
    count++;
  }
  return { total, count };
}

/** All three windows at once (for the dashboard card / insights page). */
export function summarizeSpendWindows(
  payments: PaymentRow[],
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Record<SpendWindow, SpendWindowSummary> {
  return {
    '7d': summarizeSpend(payments, '7d', nowSeconds),
    '30d': summarizeSpend(payments, '30d', nowSeconds),
    all: summarizeSpend(payments, 'all', nowSeconds),
  };
}
