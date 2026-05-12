import {browser} from '$app/environment';
import type {Address} from '@circles-sdk/utils';
import {getWalletProvider} from '$lib/shared/integrations/wallet';
import {ensureGnosisChain} from '$lib/shared/integrations/chain/gnosis';
import {getMarketClient} from '$lib/shared/data/market/marketClientProxy';
import {gnosisConfig} from '$lib/shared/config/circles';

export interface AdminChallengeResponse {
  challengeId: string;
  message: string;
  expiresAt: string;
}

export interface AdminVerifyResponse {
  token: string;
  address: string;
  chainId: number;
  expiresIn: number;
}

/**
 * Get the admin API base URL from config or environment
 */
export function getAdminBaseUrl(): string {
  if (!browser) {
    throw new Error('getAdminClient() can only be used in the browser');
  }

  const envBase = gnosisConfig.production.marketApiBase;
  if (!envBase) {
    throw new Error('Admin API base URL not configured');
  }
  return String(envBase).replace(/\/$/, '');
}

/**
 * Create an admin authentication challenge
 */
export async function createAdminChallenge(
  address: Address,
  chainId: number = 100
): Promise<AdminChallengeResponse> {
  const baseUrl = getAdminBaseUrl();

  const res = await fetch(`${baseUrl}/admin/auth/challenge`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({address, chainId}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Admin challenge failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<AdminChallengeResponse>;
}

/**
 * Verify a signed admin challenge and receive JWT token
 */
export async function verifyAdminChallenge(
  challengeId: string,
  signature: `0x${string}`
): Promise<AdminVerifyResponse> {
  const baseUrl = getAdminBaseUrl();

  const res = await fetch(`${baseUrl}/admin/auth/verify`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({challengeId, signature}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Admin verify failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<AdminVerifyResponse>;
}

/**
 * Sign in to Market Admin using the connected Safe avatar.
 * Mirrors Market auth's Safe-based SIWE flow, but hits /admin endpoints.
 */
export async function signInAdminWithSafe(options: {
  avatar: Address;
  chainId?: number;
}): Promise<AdminVerifyResponse> {
  if (!browser) {
    throw new Error('signInAdminWithSafe() can only be used in the browser');
  }

  const chainId = options.chainId ?? gnosisConfig.production.marketChainId;
  if (!chainId || chainId !== gnosisConfig.production.marketChainId) {
    throw new Error(
      `signInAdminWithSafe currently supports only Gnosis chain (${gnosisConfig.production.marketChainId}); received ${chainId}`,
    );
  }

  const avatarLower = options.avatar.toLowerCase() as Address;
  const challenge = await createAdminChallenge(avatarLower, chainId);
  const msgBytes = new TextEncoder().encode(challenge.message);

  const ethereum = getWalletProvider();
  await ensureGnosisChain(ethereum);
  const safeSigner = await getMarketClient().signers.createSafeSignerForAvatar({
    avatar: avatarLower,
    ethereum,
    chainId: BigInt(chainId),
    enforceChainId: true,
  });

  const signature = await safeSigner.signBytes(msgBytes);
  const sigText = typeof signature === 'string' ? signature.trim() : '';
  if (!/^0x[0-9a-fA-F]+$/.test(sigText)) {
    throw new Error('Wallet returned an invalid signature format (expected 0x-prefixed hex)');
  }

  const verified = await verifyAdminChallenge(challenge.challengeId, sigText as `0x${string}`);
  setAdminToken(verified.token);
  return verified;
}

/**
 * Store for admin JWT token
 */
let _adminToken: string | null = null;

export function setAdminToken(token: string): void {
  _adminToken = token;
}

export function clearAdminToken(): void {
  _adminToken = null;
}

export function getAdminToken(): string | null {
  return _adminToken;
}

/**
 * Get authorization header for admin requests
 */
export function getAdminAuthHeader(): Record<string, string> {
  const token = getAdminToken();
  return (token ? {Authorization: `Bearer ${token}`} : {}) as Record<string, string>;
}