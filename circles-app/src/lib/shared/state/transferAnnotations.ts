import { get, writable } from 'svelte/store';
import { decodeCrcV2TransferData } from '@aboutcircles/sdk-utils';
import type { Avatar } from '@aboutcircles/sdk';
import type { Address } from '@aboutcircles/sdk-types';
import { circles } from '$lib/shared/state/circles';

/**
 * Transfer annotations ("transfer data").
 *
 * A note/message/CID can be attached to a Circles transfer. For pCRC (ERC-1155) it rides in the
 * transfer's `data`; for gCRC (ERC-20) it rides a separate 0-value ERC-1155 transfer batched into
 * the same tx. The indexer extracts both into `CrcV2_TransferData`, exposed by the JSON-RPC method
 * `circles_getTransferData`. We read it via the generic `rpc.client.call` (no SDK wrapper needed —
 * mirrors how `circles_query` is already called elsewhere) and decode with `decodeCrcV2TransferData`.
 *
 * Annotations are keyed only by `(transactionHash, from, to)` — there is no explicit link to a
 * specific value-transfer leg — so we group them by transaction hash for lookup against the
 * grouped transaction-history rows.
 */

/** One annotation row as returned by `circles_getTransferData`, plus its decoded payload. */
export interface TransferAnnotation {
  transactionHash: string;
  from: Address;
  to: Address;
  /** 0x-prefixed hex blob. */
  data: string;
  /** Human-readable text if the blob is a recognized annotation envelope; null if undecodable. */
  text: string | null;
}

interface RawTransferDataRow {
  transactionHash: string;
  from: Address;
  to: Address;
  data: string;
}

interface TransferDataResponse {
  results: RawTransferDataRow[];
  hasMore: boolean;
  nextCursor: string | null;
}

// Annotations are sparse (most transfers carry none), so a single generous page covers
// virtually every avatar. If an avatar ever exceeds this, we log and stop rather than
// silently truncating.
const FETCH_LIMIT = 1000;

/** transactionHash (lowercase) → annotations attached to that transaction. */
export const annotationsByTx = writable<Map<string, TransferAnnotation[]>>(new Map());

let loadedFor: string | null = null;

/**
 * Reduce a decoded payload to a single display string, or null when there is nothing
 * human-readable to show (e.g. an ABI/calldata payload or an undecodable legacy blob).
 */
function payloadToText(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return payload.length > 0 ? payload : null;
  }
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return null;
}

function decodeText(data: string): string | null {
  try {
    const decoded = decodeCrcV2TransferData(data);
    return payloadToText(decoded.payload);
  } catch {
    // Legacy / non-envelope blobs (e.g. raw bytes or an unrecognized version) — not an error,
    // just nothing to display.
    return null;
  }
}

/**
 * Fetch and decode all transfer-data annotations for an avatar, populating {@link annotationsByTx}.
 * One RPC call per history load; safe to call repeatedly (no-ops for the same avatar unless forced).
 */
export async function loadTransferAnnotations(avatar: Avatar, force = false): Promise<void> {
  const address = avatar?.address?.toLowerCase();
  if (!address) return;
  if (!force && loadedFor === address) return;

  const sdk = get(circles);
  if (!sdk?.rpc) return;

  try {
    const response = await sdk.rpc.client.call<unknown[], TransferDataResponse>(
      'circles_getTransferData',
      [address, null, null, null, null, FETCH_LIMIT, null]
    );

    const byTx = new Map<string, TransferAnnotation[]>();
    for (const row of response.results) {
      const annotation: TransferAnnotation = {
        transactionHash: row.transactionHash,
        from: row.from,
        to: row.to,
        data: row.data,
        text: decodeText(row.data),
      };
      const key = row.transactionHash.toLowerCase();
      const list = byTx.get(key);
      if (list) {
        list.push(annotation);
      } else {
        byTx.set(key, [annotation]);
      }
    }

    if (response.hasMore) {
      console.warn(
        `[transferAnnotations] ${address} has more than ${FETCH_LIMIT} annotations; only the first page is shown.`
      );
    }

    annotationsByTx.set(byTx);
    loadedFor = address;
  } catch (error) {
    // Non-fatal: annotations are supplementary. Surface for debugging, leave history intact.
    console.error('[transferAnnotations] failed to load:', error);
  }
}

/** Annotations for a transaction hash (empty array if none). */
export function getAnnotationsForTx(transactionHash: string): TransferAnnotation[] {
  return get(annotationsByTx).get(transactionHash.toLowerCase()) ?? [];
}

/** Reset cached state (e.g. on avatar switch) so the next load refetches. */
export function resetTransferAnnotations(): void {
  loadedFor = null;
  annotationsByTx.set(new Map());
}
