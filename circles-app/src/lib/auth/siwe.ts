// src/lib/auth/siwe.ts
import { browser } from '$app/environment';

// Prefer env override, fallback to existing MARKET_API_BASE
const DEFAULT_BASE = (import.meta as any).env?.VITE_MARKET_API_BASE || 'https://static.174.163.76.144.clients.your-server.de/market';

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

// Minimal in-memory token holder (avoid localStorage for security)
let tokenMemory: string | null = null;
let tokenExp: number | null = null; // epoch ms
let tokenMeta: { address: string; chainId: number } | null = null;

export function setAuthToken(token: string, expiresInSeconds: number, address: string, chainId: number) {
  tokenMemory = token;
  // safety margin of 5 seconds
  const ttl = Math.max(1, Math.floor(expiresInSeconds) - 5) * 1000;
  tokenExp = Date.now() + ttl;
  tokenMeta = { address: address.toLowerCase(), chainId };
}

export function getAuthToken(): string | null {
  if (!browser) return null;
  if (!tokenMemory || !tokenExp || Date.now() >= tokenExp) return null;
  return tokenMemory;
}

export function getAuthMeta(): { address: string; chainId: number } | null {
  return getAuthToken() ? tokenMeta : null;
}

export function clearAuth() {
  tokenMemory = null;
  tokenExp = null;
  tokenMeta = null;
}
