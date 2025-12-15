import type { Address } from '@circles-sdk/utils';

// Per-avatar market scan settings persisted to localStorage (SSR-safe)
export type MarketScanSettings = {
  extraAvatars: Address[];
  extraOperators: Address[];
};

const KEY = (avatar: string) => `market:settings:${avatar?.toLowerCase?.() ?? ''}`;

function read(avatar: string | null | undefined): MarketScanSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY(avatar || ''));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalize(parsed);
  } catch {
    return null;
  }
}

function write(avatar: string | null | undefined, value: MarketScanSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY(avatar || ''), JSON.stringify(normalize(value)));
  } catch (e) {
    console.error('[marketSettings] Failed to save settings:', e);
  }
}

function addrList(x: unknown): Address[] {
  if (!Array.isArray(x)) return [] as Address[];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of x) {
    const s = (typeof v === 'string' ? v : '').toLowerCase().trim();
    if (s && /^0x[0-9a-f]{40}$/.test(s) && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out as Address[];
}

function normalize(v: any): MarketScanSettings {
  return {
    extraAvatars: addrList(v?.extraAvatars),
    extraOperators: addrList(v?.extraOperators),
  };
}

export function getSettings(avatar: Address | '' | null | undefined): MarketScanSettings {
  return read(avatar || '') ?? { extraAvatars: [], extraOperators: [] };
}

export function saveSettings(
  avatar: Address | '' | null | undefined,
  settings: Partial<MarketScanSettings>
): MarketScanSettings {
  const current = getSettings(avatar);
  const next = normalize({ ...current, ...settings });
  write(avatar || '', next);
  return next;
}

export function parseAddresses(input: string): Address[] {
  const parts = input
    .split(/[,\n\r\s]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (/^0x[0-9a-f]{40}$/.test(p) && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out as Address[];
}
