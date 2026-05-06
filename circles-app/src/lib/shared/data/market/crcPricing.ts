import { gnosisConfig } from '$lib/shared/config/circles';

export type CrcPrice = {
  dcrc_eur: number;
  dcrc_xdai: number;
  date: string;
  source: string;
};

/**
 * Per-date in-memory cache + inflight-promise dedup so concurrent rows for the
 * same day share one fetch. Mirrors marketplaceExplorer.html:1067-1087.
 */
const priceCache = new Map<string, CrcPrice | null>();
const inflight = new Map<string, Promise<CrcPrice | null>>();

function dateKey(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString().slice(0, 10);
}

function endpoint(): string | undefined {
  // ring vs production share the same metrics endpoint; production is a safe default here.
  return gnosisConfig.production.crcPricingApi;
}

const MAX_PLAUSIBLE_RATE = 100;
function sanitizeRate(v: unknown): number | null {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  if (v <= 0 || v > MAX_PLAUSIBLE_RATE) return null;
  return v;
}

export async function getCrcPrice(unixTimestamp: number): Promise<CrcPrice | null> {
  if (!isFinite(unixTimestamp) || unixTimestamp <= 0) return null;
  const base = endpoint();
  if (!base) return null;

  const date = dateKey(unixTimestamp);
  if (priceCache.has(date)) return priceCache.get(date)!;
  const pending = inflight.get(date);
  if (pending) return pending;

  const p = (async (): Promise<CrcPrice | null> => {
    try {
      const url = `${base}?date=${date}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        priceCache.set(date, null);
        return null;
      }
      const data = (await resp.json()) as Partial<CrcPrice> | null;
      // Clamp upper bound: if the metrics endpoint is hijacked or returns garbage,
      // a multiplier > 100 EUR/CRC is implausible and would produce nonsense totals.
      const eur = sanitizeRate(data?.dcrc_eur);
      const xdai = sanitizeRate(data?.dcrc_xdai);
      if (eur === null && xdai === null) {
        priceCache.set(date, null);
        return null;
      }
      const out: CrcPrice = {
        dcrc_eur: eur ?? 0,
        dcrc_xdai: xdai ?? 0,
        date: String(data!.date ?? date),
        source: String(data!.source ?? ''),
      };
      priceCache.set(date, out);
      return out;
    } catch (e) {
      console.warn('[crcPricing] fetch failed for', date, e);
      priceCache.set(date, null);
      return null;
    } finally {
      inflight.delete(date);
    }
  })();

  inflight.set(date, p);
  return p;
}

/** Convert CRC amount to EUR using the dcrc_eur rate, falling back to dcrc_xdai. */
export function applyCrcRate(crc: number, price: CrcPrice | null): { eur: number; usedFallback: boolean } | null {
  if (!price) return null;
  if (price.dcrc_eur > 0) return { eur: crc * price.dcrc_eur, usedFallback: false };
  if (price.dcrc_xdai > 0) return { eur: crc * price.dcrc_xdai, usedFallback: true };
  return null;
}
