import {browser} from '$app/environment';
import type {Address} from '@aboutcircles/sdk-types';
import {getWalletProvider} from '$lib/shared/integrations/wallet';
import {ensureGnosisChain} from '$lib/shared/integrations/chain/gnosis';
import {getMarketClient} from '$lib/shared/data/market/marketClientProxy';
import {gnosisConfig} from '$lib/shared/config/circles';
import {getActiveConfig} from '$lib/shared/state/settings.svelte';

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
 * The active market-api host, normalized (trailing slash stripped), or '' when
 * unresolved. Follows the Production/Staging server toggle via getActiveConfig().
 * Browser-independent so admin token host-binding works uniformly in SSR and tests;
 * the browser-only assumption is enforced separately by getAdminBaseUrl().
 */
function activeAdminHost(): string {
  const base = getActiveConfig().marketApiBase;
  return base ? String(base).replace(/\/$/, '') : '';
}

/**
 * Get the admin API base URL from config or environment
 */
export function getAdminBaseUrl(): string {
  if (!browser) {
    throw new Error('getAdminClient() can only be used in the browser');
  }

  const base = activeAdminHost();
  if (!base) {
    throw new Error('Admin API base URL not configured');
  }
  return base;
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
 * An admin JWT is only valid for the market-api host it was minted against — each
 * environment signs with its own ADMIN_JWT_SECRET, so a production token is rejected
 * (401) by staging and vice versa. Returns the token only while the session's host
 * still matches the active host; once the Production/Staging toggle moves the base it
 * returns null, so a stale cross-environment token is never put on the wire.
 */
export function selectValidAdminToken(
  session: {token: string; host: string} | null,
  activeHost: string,
): string | null {
  if (!session) return null;
  return session.host === activeHost ? session.token : null;
}

/**
 * In-memory admin session, bound to the market-api host it was minted against so a
 * later server-toggle flip invalidates it instead of leaking it cross-environment.
 */
let _adminSession: {token: string; host: string} | null = null;

export function setAdminToken(token: string): void {
  _adminSession = {token, host: activeAdminHost()};
}

export function clearAdminToken(): void {
  _adminSession = null;
}

export function getAdminToken(): string | null {
  if (!_adminSession) return null;

  const host = activeAdminHost();
  // Can't resolve the active host (unset config) — don't clobber the session on a
  // transient gap; leave validation to the next resolvable read.
  if (!host) return _adminSession.token;

  const valid = selectValidAdminToken(_adminSession, host);
  // Drop a token that no longer matches the active host: the server toggle moved the
  // base out from under this session, so the token is now cross-environment.
  if (!valid) _adminSession = null;
  return valid;
}

/**
 * Get authorization header for admin requests
 */
export function getAdminAuthHeader(): Record<string, string> {
  const token = getAdminToken();
  return (token ? {Authorization: `Bearer ${token}`} : {}) as Record<string, string>;
}