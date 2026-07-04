// src/lib/sdk/persistentAuthContext.ts
// LocalStorage-backed AuthContext for CirclesClient. SSR-safe.
import { browser } from '$app/environment';
import type { AuthContext, AuthContextMeta } from '@circles-market/sdk';

const KEY_TOKEN = 'circles_market_token';
const KEY_EXP = 'circles_market_exp'; // epoch seconds
const KEY_ADDR = 'circles_market_addr';
const KEY_CHAIN = 'circles_market_chainId';
const KEY_PREFIXES = [KEY_TOKEN, KEY_EXP, KEY_ADDR, KEY_CHAIN];

const GRACE_SECONDS = 15; // avoid edge-expiry races

/**
 * Per-environment key namespace derived from the market-api base. The market-api
 * mints its own JWT (bound to that deployment's auth realm), so a token issued by
 * production must not be sent to staging and vice-versa. Canonical production keeps
 * the legacy, unsuffixed keys so sessions predating namespacing survive the deploy;
 * every other base (staging, localhost, a VITE override) gets a host-suffixed
 * keyspace of its own, letting prod and staging sessions coexist.
 */
function namespaceFor(baseUrl?: string): string {
  if (!baseUrl) return '';
  try {
    const host = new URL(baseUrl).host;
    if (host === 'market-api.aboutcircles.com') return '';
    return '_' + host;
  } catch {
    return '';
  }
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function readLocalStorage(key: string): string | null {
  if (!browser) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    console.debug('[auth] failed to read local storage', { key }, e);
    return null;
  }
}

function writeLocalStorage(key: string, val: string | null): void {
  if (!browser) return;
  try {
    if (val === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, val);
  } catch (e) {
    // ignore
    console.debug('[auth] failed to write local storage', { key }, e);
  }
}

export class PersistentAuthContext implements AuthContext {
  private readonly kToken: string;
  private readonly kExp: string;
  private readonly kAddr: string;
  private readonly kChain: string;

  /** @param baseUrl the resolved market-api base; namespaces the token keyspace. */
  constructor(baseUrl?: string) {
    const ns = namespaceFor(baseUrl);
    this.kToken = KEY_TOKEN + ns;
    this.kExp = KEY_EXP + ns;
    this.kAddr = KEY_ADDR + ns;
    this.kChain = KEY_CHAIN + ns;
  }

  getToken(): string | null {
    const token = readLocalStorage(this.kToken);
    const expStr = readLocalStorage(this.kExp);
    if (!token || !expStr) return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp)) return null;
    if (nowSec() >= exp - GRACE_SECONDS) return null;
    return token;
  }

  setToken(token: string, expSeconds: number, addr: string, chainId: number): void {
    const expAbs = nowSec() + Math.max(0, Math.floor(expSeconds));
    writeLocalStorage(this.kToken, token);
    writeLocalStorage(this.kExp, String(expAbs));
    writeLocalStorage(this.kAddr, addr.toLowerCase());
    writeLocalStorage(this.kChain, String(chainId));
  }

  /** Clears the token for this instance's environment only (SDK 401 handling). */
  clear(): void {
    writeLocalStorage(this.kToken, null);
    writeLocalStorage(this.kExp, null);
    writeLocalStorage(this.kAddr, null);
    writeLocalStorage(this.kChain, null);
  }

  getMeta(): AuthContextMeta | null {
    const token = this.getToken();
    if (!token) return null;
    const addr = readLocalStorage(this.kAddr);
    const chainStr = readLocalStorage(this.kChain);
    if (!addr || !chainStr) return null;
    const chainId = Number(chainStr);
    if (!Number.isFinite(chainId)) return null;
    return { address: addr, chainId };
  }

  /**
   * Clears the market session across every environment namespace. Used on account
   * switch / logout, where the token must be dropped regardless of which server the
   * user is currently pointed at.
   */
  static clearAll(): void {
    if (!browser) return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && KEY_PREFIXES.some((p) => k === p || k.startsWith(p + '_'))) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) window.localStorage.removeItem(k);
    } catch (e) {
      console.debug('[auth] failed to clear all market sessions', e);
    }
  }
}
