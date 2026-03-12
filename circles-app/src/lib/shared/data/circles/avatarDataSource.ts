import type { Sdk, Avatar } from '@aboutcircles/sdk';
import type { Address, AvatarInfo, TokenBalanceRow } from '@aboutcircles/sdk-types';

export interface AvatarDataSource {
  getAvatarInfo(address: Address): Promise<AvatarInfo | undefined>;
  getAvatarInfoBatch(addresses: Address[]): Promise<(AvatarInfo | undefined)[]>;
  getBalances(avatar: Avatar): Promise<TokenBalanceRow[]>;
  getTransactionHistory(
    avatar: Avatar,
    pageSize: number
  ): Promise<any>; // TODO: fix type - PagedResponse<TransactionHistoryRow>
}

/**
 * Module-level avatar info cache.
 * Keyed by lowercase address, shared across all createAvatarDataSource instances.
 * Prevents duplicate fetches when the same addresses are requested multiple times
 * (e.g., enrichContactData calls getAvatarInfoBatch twice for the same set).
 */
const avatarInfoCache = new Map<string, AvatarInfo>();

const BATCH_CHUNK_SIZE = 50;
const INTER_CHUNK_DELAY_MS = 100;

export function createAvatarDataSource(sdk: Sdk): AvatarDataSource {
  return {
    async getAvatarInfo(address: Address): Promise<AvatarInfo | undefined> {
      const key = address.toLowerCase();
      const cached = avatarInfoCache.get(key);
      if (cached) return cached;

      const info = await sdk.data.getAvatar(address);
      if (info) avatarInfoCache.set(key, info);
      return info;
    },

    async getAvatarInfoBatch(addresses: Address[]): Promise<(AvatarInfo | undefined)[]> {
      // 1) Resolve from cache, collect misses
      const results: (AvatarInfo | undefined)[] = new Array(addresses.length);
      const missIndices: number[] = [];
      const missAddresses: Address[] = [];

      for (let i = 0; i < addresses.length; i++) {
        const key = addresses[i].toLowerCase();
        const cached = avatarInfoCache.get(key);
        if (cached) {
          results[i] = cached;
        } else {
          missIndices.push(i);
          missAddresses.push(addresses[i]);
        }
      }

      if (missAddresses.length === 0) return results;

      // 2) Fetch misses using the batch RPC endpoint (1 call per 50 addresses
      //    instead of 50 individual HTTP requests)
      for (let c = 0; c < missAddresses.length; c += BATCH_CHUNK_SIZE) {
        const chunk = missAddresses.slice(c, c + BATCH_CHUNK_SIZE);
        try {
          const infos: AvatarInfo[] = await sdk.rpc.avatar.getAvatarInfoBatch(chunk);
          const infoByAddr = new Map<string, AvatarInfo>();
          for (const info of infos) {
            if (info?.avatar) {
              const key = info.avatar.toLowerCase();
              infoByAddr.set(key, info);
              avatarInfoCache.set(key, info);
            }
          }
          // Map back to result positions
          for (let j = c; j < c + chunk.length; j++) {
            const addr = missAddresses[j].toLowerCase();
            results[missIndices[j]] = infoByAddr.get(addr);
          }
        } catch (e) {
          console.warn('[AvatarDataSource] Batch chunk failed, skipping:', e);
          // Leave those entries as undefined — callers handle missing gracefully
        }

        // Delay between chunks to avoid rate limiting (429s)
        if (c + BATCH_CHUNK_SIZE < missAddresses.length) {
          await new Promise((r) => setTimeout(r, INTER_CHUNK_DELAY_MS));
        }
      }

      return results;
    },

    async getBalances(avatar: Avatar): Promise<TokenBalanceRow[]> {
      return await avatar.balances.getTokenBalances();
    },

    async getTransactionHistory(
      avatar: Avatar,
      pageSize: number
    ): Promise<any> {
      return await avatar.history.getTransactions(pageSize);
    },
  };
}

/** Clear the avatar info cache (e.g., on disconnect/session clear) */
export function clearAvatarInfoCache(): void {
  avatarInfoCache.clear();
}

/**
 * Synchronous lookup into the avatar info cache.
 * Returns the cached AvatarInfo if it was previously fetched, otherwise undefined.
 * Use this for non-blocking UI classification (e.g., determining if a tokenOwner is a group).
 */
export function getAvatarInfoCached(address: string): AvatarInfo | undefined {
  return avatarInfoCache.get(address.toLowerCase());
}
