import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { Avatar } from '@aboutcircles/sdk';
import { encodeCrcV2TransferData } from '@aboutcircles/sdk-utils';
import { circles } from '$lib/shared/state/circles';
import {
  loadTransferAnnotations,
  resetTransferAnnotations,
  annotationsByTx,
} from '$lib/shared/state/transferAnnotations';

const AVATAR = { address: '0xaAaA000000000000000000000000000000000001' } as unknown as Avatar;
const TX = '0x' + 'a'.repeat(64);
const TO = '0xbBbB000000000000000000000000000000000002';

/**
 * Replace the global `circles` SDK store with a stub whose `rpc.client.call`
 * returns the given transfer-data rows, and record the calls made.
 */
function mockSdkReturning(rows: Array<Record<string, unknown>>, hasMore = false) {
  const calls: Array<{ method: string; params: unknown }> = [];
  circles.set({
    rpc: {
      client: {
        call: async (method: string, params: unknown) => {
          calls.push({ method, params });
          return { results: rows, hasMore, nextCursor: null };
        },
      },
    },
  } as never);
  return calls;
}

describe('transferAnnotations', () => {
  beforeEach(() => {
    resetTransferAnnotations();
  });

  it('calls circles_getTransferData with the lowercased avatar address and limit', async () => {
    const calls = mockSdkReturning([]);
    await loadTransferAnnotations(AVATAR, true);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('circles_getTransferData');
    const params = calls[0].params as unknown[];
    expect(params[0]).toBe(AVATAR.address.toLowerCase());
    expect(params[5]).toBe(1000); // FETCH_LIMIT in the limit slot
  });

  it('decodes a UTF-8 text annotation (0x0001) and keys it by transaction hash', async () => {
    const data = encodeCrcV2TransferData(['hello note'], 0x0001);
    mockSdkReturning([{ transactionHash: TX, from: AVATAR.address, to: TO, data }]);
    await loadTransferAnnotations(AVATAR, true);
    const list = get(annotationsByTx).get(TX.toLowerCase());
    expect(list).toHaveLength(1);
    expect(list?.[0].text).toBe('hello note');
  });

  it('does NOT surface machine-reference types (XMTP id 0x0002) as a note', async () => {
    const xmtp = encodeCrcV2TransferData(['0x' + 'ab'.repeat(32)], 0x0002);
    mockSdkReturning([{ transactionHash: TX, from: AVATAR.address, to: TO, data: xmtp }]);
    await loadTransferAnnotations(AVATAR, true);
    expect(get(annotationsByTx).get(TX.toLowerCase())?.[0].text).toBeNull();
  });

  it('returns null text for an undecodable blob without throwing', async () => {
    mockSdkReturning([{ transactionHash: TX, from: AVATAR.address, to: TO, data: '0x00' }]);
    await loadTransferAnnotations(AVATAR, true);
    expect(get(annotationsByTx).get(TX.toLowerCase())?.[0].text).toBeNull();
  });

  it('groups multiple annotations under the same transaction hash, in order', async () => {
    const d1 = encodeCrcV2TransferData(['first'], 0x0001);
    const d2 = encodeCrcV2TransferData(['second'], 0x0001);
    mockSdkReturning([
      { transactionHash: TX, from: AVATAR.address, to: TO, data: d1 },
      { transactionHash: TX, from: TO, to: AVATAR.address, data: d2 },
    ]);
    await loadTransferAnnotations(AVATAR, true);
    expect(get(annotationsByTx).get(TX.toLowerCase())?.map((a) => a.text)).toEqual([
      'first',
      'second',
    ]);
  });

  it('no-ops when the SDK is unavailable', async () => {
    circles.set(undefined);
    await loadTransferAnnotations(AVATAR, true);
    expect(get(annotationsByTx).size).toBe(0);
  });

  it('swallows RPC errors and leaves the annotation map empty (history must not break)', async () => {
    circles.set({
      rpc: { client: { call: async () => { throw new Error('rpc down'); } } },
    } as never);
    await loadTransferAnnotations(AVATAR, true);
    expect(get(annotationsByTx).size).toBe(0);
  });

  it('resetTransferAnnotations clears the store', async () => {
    const data = encodeCrcV2TransferData(['x'], 0x0001);
    mockSdkReturning([{ transactionHash: TX, from: AVATAR.address, to: TO, data }]);
    await loadTransferAnnotations(AVATAR, true);
    expect(get(annotationsByTx).size).toBe(1);
    resetTransferAnnotations();
    expect(get(annotationsByTx).size).toBe(0);
  });
});
