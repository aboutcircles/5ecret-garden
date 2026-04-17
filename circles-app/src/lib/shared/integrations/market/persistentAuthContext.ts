// src/lib/sdk/persistentAuthContext.ts
// LocalStorage-backed AuthContext for CirclesClient. SSR-safe.
import { browser } from '$app/environment';
import type { AuthContext, AuthContextMeta } from '@circles-market/sdk';

const KEY_TOKEN = 'circles_market_token';
const KEY_EXP = 'circles_market_exp'; // epoch seconds
const KEY_ADDR = 'circles_market_addr';
const KEY_CHAIN = 'circles_market_chainId';

const GRACE_SECONDS = 15; // avoid edge-expiry races

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
  getToken(): string | null {
    const token = readLocalStorage(KEY_TOKEN);
    const expStr = readLocalStorage(KEY_EXP);
    if (!token || !expStr) return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp)) return null;
    if (nowSec() >= exp - GRACE_SECONDS) return null;
    return token;
  }

  setToken(token: string, expSeconds: number, addr: string, chainId: number): void {
    const expAbs = nowSec() + Math.max(0, Math.floor(expSeconds));
    writeLocalStorage(KEY_TOKEN, token);
    writeLocalStorage(KEY_EXP, String(expAbs));
    writeLocalStorage(KEY_ADDR, addr.toLowerCase());
    writeLocalStorage(KEY_CHAIN, String(chainId));
  }

  clear(): void {
    writeLocalStorage(KEY_TOKEN, null);
    writeLocalStorage(KEY_EXP, null);
    writeLocalStorage(KEY_ADDR, null);
    writeLocalStorage(KEY_CHAIN, null);
  }

  getMeta(): AuthContextMeta | null {
    const token = this.getToken();
    if (!token) return null;
    const addr = readLocalStorage(KEY_ADDR);
    const chainStr = readLocalStorage(KEY_CHAIN);
    if (!addr || !chainStr) return null;
    const chainId = Number(chainStr);
    if (!Number.isFinite(chainId)) return null;
    return { address: addr, chainId };
  }
}
