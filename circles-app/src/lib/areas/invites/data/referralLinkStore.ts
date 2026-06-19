import type { Address } from '@aboutcircles/sdk-types';

/**
 * Local persistence for invite (referral) links created by this avatar.
 *
 * Why local: the referrals backend only returns *full* private keys to an
 * authenticated caller (`Referrals.listMine`), and core-app has no Circles auth
 * token. The public `listReferrals` returns masked key previews, which cannot
 * rebuild a shareable link. So the keys we generate are the only place the full
 * key lives client-side — we keep them here, keyed by inviter address.
 *
 * The keys are referral claim credentials for not-yet-funded accounts (by
 * design embedded in the shared URL). They live only in localStorage at
 * runtime — never log, commit, or fixture them.
 */

const STORAGE_KEY = 'Circles.InviteLinks';

export interface StoredReferral {
  /** Referral private key (the claim credential embedded in the shared link). */
  privateKey: `0x${string}`;
  /** ms epoch when the link was created locally. */
  createdAt: number;
  /** Whether the key has been persisted to the referrals backend yet. */
  saved: boolean;
}

type Store = Record<string, StoredReferral[]>;

function read(): Store {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('[invites] failed to persist invite links', e);
  }
}

function bucketKey(inviter: Address): string {
  return inviter.toLowerCase();
}

/** All locally-stored links for an inviter, newest first. */
export function loadReferrals(inviter: Address): StoredReferral[] {
  const list = read()[bucketKey(inviter)] ?? [];
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

/** Persist a freshly-created link. No-op if the key is already stored. */
export function addReferral(
  inviter: Address,
  privateKey: `0x${string}`,
  opts?: { saved?: boolean },
): void {
  const store = read();
  const k = bucketKey(inviter);
  const list = store[k] ?? [];
  if (list.some((r) => r.privateKey === privateKey)) return;
  list.push({ privateKey, createdAt: Date.now(), saved: opts?.saved ?? false });
  store[k] = list;
  write(store);
}

/** Mark a key as successfully persisted to the referrals backend. */
export function markSaved(inviter: Address, privateKey: `0x${string}`): void {
  const store = read();
  const list = store[bucketKey(inviter)];
  const entry = list?.find((r) => r.privateKey === privateKey);
  if (entry && !entry.saved) {
    entry.saved = true;
    write(store);
  }
}

/** Drop a key (e.g. its creation transaction failed, so the link is dead). */
export function removeReferral(inviter: Address, privateKey: `0x${string}`): void {
  const store = read();
  const k = bucketKey(inviter);
  const list = store[k];
  if (!list) return;
  store[k] = list.filter((r) => r.privateKey !== privateKey);
  write(store);
}

/** Links whose key never reached the backend (need a save retry). */
export function getUnsavedReferrals(inviter: Address): StoredReferral[] {
  return loadReferrals(inviter).filter((r) => !r.saved);
}
