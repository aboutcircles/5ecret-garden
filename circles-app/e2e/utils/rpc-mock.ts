import type { Page, Route } from '@playwright/test';
import {
  TEST_AVATAR_ADDRESS,
  avatarInfo,
  tokenBalances,
  trustRelations,
  transactionHistory,
  profile,
  contactProfiles,
} from '../fixtures/test-data';

/**
 * Domains to intercept — covers both Chiado (testnet) and Gnosis (prod) endpoints.
 */
const INTERCEPTED_DOMAINS = [
  'chiado-rpc.aboutcircles.com',
  'rpc.aboutcircles.com',
  'chiado-pathfinder.aboutcircles.com',
  'pathfinder.aboutcircles.com',
  'market-api.aboutcircles.com',
];

/** JSON-RPC response wrapper */
function rpcResponse(id: number | string, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

/** Handle Circles RPC method calls */
function handleCirclesRpc(method: string): unknown {
  switch (method) {
    case 'circles_getAvatar':
      return avatarInfo;

    case 'circles_getTrustRelations':
      return trustRelations;

    case 'circles_getTokenBalances':
      return tokenBalances;

    case 'circles_getTransactionHistory':
      return transactionHistory;

    case 'circles_getTotalBalance':
      return '50000000000000000000';

    case 'circles_getInvitations':
      return [];

    case 'circles_searchProfiles':
      return [];

    default:
      return null;
  }
}

/** Handle Ethereum JSON-RPC method calls */
function handleEthRpc(method: string): unknown {
  switch (method) {
    case 'eth_chainId':
      return '0x27d8'; // Chiado chain ID 10200
    case 'eth_blockNumber':
      return '0xF4240'; // 1000000
    case 'eth_getBalance':
      return '0x16345785D8A0000'; // 0.1 ETH
    case 'eth_call':
      return '0x' + '0'.repeat(64);
    case 'net_version':
      return '10200';
    default:
      return null;
  }
}

/** Handle profile service requests */
function handleProfileRequest(url: string): unknown {
  const address = url.split('/').pop()?.toLowerCase();
  if (address === TEST_AVATAR_ADDRESS.toLowerCase()) {
    return profile;
  }
  if (address && address in contactProfiles) {
    return contactProfiles[address as keyof typeof contactProfiles];
  }
  return null;
}

/**
 * Set up network-level mocking for all Circles SDK endpoints.
 * Intercepts RPC calls and returns canned fixture data.
 */
export async function setupRpcMocks(page: Page) {
  await page.route(
    (url) => INTERCEPTED_DOMAINS.some((d) => url.hostname.includes(d)),
    async (route: Route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Profile service GET requests
      if (url.includes('/profiles/') && method === 'GET') {
        const result = handleProfileRequest(url);
        if (result) {
          return route.fulfill({ json: result });
        }
        return route.fulfill({ status: 404, json: { error: 'not found' } });
      }

      // Market API — return empty arrays for listing endpoints
      if (url.includes('market-api')) {
        return route.fulfill({ json: [] });
      }

      // Pathfinder requests
      if (url.includes('pathfinder')) {
        return route.fulfill({
          json: { maxFlow: '50000000000000000000', paths: [] },
        });
      }

      // JSON-RPC POST requests (Circles RPC + chain RPC)
      if (method === 'POST') {
        try {
          const body = await route.request().postDataJSON();
          const { id, method: rpcMethod } = body;

          // Try Circles RPC first, then Ethereum RPC
          let result = handleCirclesRpc(rpcMethod);
          if (result === null) {
            result = handleEthRpc(rpcMethod);
          }

          if (result !== null) {
            return route.fulfill({ json: rpcResponse(id, result) });
          }

          // Unknown method — return null result
          return route.fulfill({ json: rpcResponse(id, null) });
        } catch {
          return route.fulfill({ json: rpcResponse(0, null) });
        }
      }

      // Fallback: abort unhandled requests
      return route.abort();
    },
  );
}
