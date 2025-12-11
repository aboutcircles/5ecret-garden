// src/lib/auth/siwe.ts
import { browser } from '$app/environment';
import { MARKET_API_BASE } from '$lib/config/market';
import { getMarketClient } from '$lib/sdk/marketClient';

// Prefer env override; fallback to configured MARKET_API_BASE (shared with catalog)
const DEFAULT_BASE = (import.meta as any).env?.VITE_MARKET_API_BASE || MARKET_API_BASE;

export type ChallengeResp = {
  challengeId: string;
  message: string;
  nonce: string;
  expiresAt: string;
};

export type VerifyResp = {
  token: string;
  address: string;
  chainId: number;
  expiresIn: number; // seconds
};

function resolveBase(): string {
  // Avoid importing MARKET_API_BASE to prevent circular deps; allow env override
  return String(DEFAULT_BASE).replace(/\/$/, '');
}

export async function requestChallenge(address: string, chainId: number, base?: string) {
  const url = `${(base ?? resolveBase())}/api/auth/challenge`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, chainId }),
  });
  if (!res.ok) throw new Error(`challenge failed: ${res.status}`);
  return (await res.json()) as ChallengeResp;
}

export async function verifyChallenge(challengeId: string, signature: string, base?: string) {
  const url = `${(base ?? resolveBase())}/api/auth/verify`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, signature }),
  });
  if (res.status === 401) throw new Error('invalid/expired challenge or bad signature');
  if (!res.ok) throw new Error(`verify failed: ${res.status}`);
  return (await res.json()) as VerifyResp;
}

// Bridge token/meta to SDK's AuthContext to avoid duplicated state
export function getAuthToken(): string | null {
  if (!browser) return null;
  try {
    const client = getMarketClient();
    return client.authContext.getToken();
  } catch (_) {
    return null;
  }
}

export function getAuthMeta(): { address: string; chainId: number } | null {
  try {
    const client = getMarketClient();
    return client.auth.getAuthMeta();
  } catch (_) {
    return null;
  }
}

export function clearAuth() {
  try {
    const client = getMarketClient();
    client.auth.signOut();
  } catch {}
}
