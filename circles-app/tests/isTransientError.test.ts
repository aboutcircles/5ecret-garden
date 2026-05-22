import { describe, expect, it } from 'vitest';
import { isTransientError } from '$lib/shared/utils/retry';

describe('isTransientError', () => {
  describe('wallet-disconnect errors are NOT transient', () => {
    const walletDisconnectMessages = [
      'Wallet not connected. Please reconnect your wallet.',
      'Wallet not connected. Please unlock MetaMask and connect to this site.',
      'Please reconnect your wallet',
      'PLEASE UNLOCK METAMASK',
    ];

    for (const message of walletDisconnectMessages) {
      it(`treats ${JSON.stringify(message)} as definitive`, () => {
        expect(isTransientError(new Error(message))).toBe(false);
      });
    }
  });

  describe('real transient errors are still transient', () => {
    const transientMessages = [
      'WebSocket connection failed',
      'Request timeout after 5000ms',
      'Network unreachable',
      'ECONNRESET',
      'fetch failed: socket hang up',
      '502 Bad Gateway',
      'Rate limit exceeded',
      'Subscribe to events failed',
    ];

    for (const message of transientMessages) {
      it(`treats ${JSON.stringify(message)} as transient`, () => {
        expect(isTransientError(new Error(message))).toBe(true);
      });
    }
  });

  it('unknown errors are not transient', () => {
    expect(isTransientError(new Error('Unexpected runtime error'))).toBe(false);
    expect(isTransientError(new Error('Insufficient balance'))).toBe(false);
  });
});
