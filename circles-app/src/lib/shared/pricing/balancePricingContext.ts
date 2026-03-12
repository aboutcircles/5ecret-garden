import { getContext, setContext } from 'svelte';
import type { Readable } from 'svelte/store';
import type { WrappedStaticPriceMap } from '$lib/shared/pricing/wrappedStaticPricing';

const BALANCE_PRICING_CONTEXT_KEY = Symbol('balance-pricing-context');

export type BalancePricingContext = {
  wrappedStaticPrices: Readable<WrappedStaticPriceMap>;
};

export function setBalancePricingContext(context: BalancePricingContext): void {
  setContext(BALANCE_PRICING_CONTEXT_KEY, context);
}

export function getBalancePricingContext(): BalancePricingContext | undefined {
  return getContext<BalancePricingContext | undefined>(BALANCE_PRICING_CONTEXT_KEY);
}
