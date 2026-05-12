import { getDb } from './db';
import { TX_RETENTION_LIMIT } from './constants';
import type {
	CachedBalance,
	CachedGroupMembership,
	CachedTransaction,
	CachedTrust,
	CacheMeta,
	ScopeId,
} from './schema';
import type { AppProfileCore } from '$lib/shared/model/profile/types';

// ── Hydrated data returned to callers ───────────────────────────────

export interface HydratedData {
	balances: CachedBalance[];
	trusts: CachedTrust[];
	transactions: CachedTransaction[];
	groupMemberships: CachedGroupMembership[];
	meta: CacheMeta | undefined;
}

// ── Read helpers ────────────────────────────────────────────────────

export async function hydrate(scopeId: ScopeId): Promise<HydratedData | null> {
	try {
		const db = await getDb();
		const meta = await db.get('meta', scopeId);
		if (!meta) return null;

		const [balances, trusts, transactions, groupMemberships] = await Promise.all([
			db.getAllFromIndex('balances', 'byScopeId', scopeId),
			db.getAllFromIndex('trusts', 'byScopeId', scopeId),
			db.getAllFromIndex('transactions', 'byScopeId', scopeId),
			db.getAllFromIndex('groupMemberships', 'byScopeId', scopeId),
		]);

		return {
			balances,
			trusts,
			transactions: transactions.sort((a, b) => b.blockNumber - a.blockNumber),
			groupMemberships,
			meta,
		};
	} catch (e) {
		console.warn('[cache] hydrate failed, falling through to RPC', e);
		return null;
	}
}

// ── Write helpers ───────────────────────────────────────────────────

export async function writeBalances(
	scopeId: ScopeId,
	balances: Array<{ tokenId: string; [k: string]: any }>,
): Promise<void> {
	try {
		const db = await getDb();
		const tx = db.transaction('balances', 'readwrite');

		// Clear old balances for this scope, then write fresh snapshot
		const idx = tx.store.index('byScopeId');
		let cursor = await idx.openKeyCursor(scopeId);
		while (cursor) {
			await tx.store.delete(cursor.primaryKey);
			cursor = await cursor.continue();
		}

		for (const b of balances) {
			await tx.store.put({ ...b, scopeId } as any);
		}
		await tx.done;
	} catch (e) {
		console.warn('[cache] writeBalances failed', e);
	}
}

export async function writeTrusts(
	scopeId: ScopeId,
	trusts: Array<{ objectAvatar: string; [k: string]: any }>,
): Promise<void> {
	try {
		const db = await getDb();
		const tx = db.transaction('trusts', 'readwrite');

		const idx = tx.store.index('byScopeId');
		let cursor = await idx.openKeyCursor(scopeId);
		while (cursor) {
			await tx.store.delete(cursor.primaryKey);
			cursor = await cursor.continue();
		}

		for (const t of trusts) {
			await tx.store.put({ ...t, scopeId } as any);
		}
		await tx.done;
	} catch (e) {
		console.warn('[cache] writeTrusts failed', e);
	}
}

export async function writeTransactions(
	scopeId: ScopeId,
	transactions: Array<{ blockNumber: number; transactionIndex: number; logIndex: number; [k: string]: any }>,
): Promise<void> {
	try {
		const db = await getDb();
		const tx = db.transaction('transactions', 'readwrite');

		const idx = tx.store.index('byScopeId');
		let cursor = await idx.openKeyCursor(scopeId);
		while (cursor) {
			await tx.store.delete(cursor.primaryKey);
			cursor = await cursor.continue();
		}

		// Keep only the most recent TX_RETENTION_LIMIT rows
		const sorted = [...transactions]
			.sort((a, b) => b.blockNumber - a.blockNumber)
			.slice(0, TX_RETENTION_LIMIT);

		for (const row of sorted) {
			const eventKey = `${row.blockNumber}:${row.transactionIndex}:${row.logIndex}`;
			await tx.store.put({ ...row, scopeId, eventKey } as any);
		}
		await tx.done;
	} catch (e) {
		console.warn('[cache] writeTransactions failed', e);
	}
}

export async function writeProfiles(
	profiles: Map<string, AppProfileCore>,
): Promise<void> {
	try {
		const db = await getDb();
		const tx = db.transaction('profiles', 'readwrite');
		const now = Date.now();

		for (const [address, profile] of profiles) {
			await tx.store.put({
				address: address.toLowerCase(),
				profile,
				fetchedAt: now,
			});
		}
		await tx.done;
	} catch (e) {
		console.warn('[cache] writeProfiles failed', e);
	}
}

export async function writeGroupMemberships(
	scopeId: ScopeId,
	memberships: Array<{ group: string; [k: string]: any }>,
): Promise<void> {
	try {
		const db = await getDb();
		const tx = db.transaction('groupMemberships', 'readwrite');

		const idx = tx.store.index('byScopeId');
		let cursor = await idx.openKeyCursor(scopeId);
		while (cursor) {
			await tx.store.delete(cursor.primaryKey);
			cursor = await cursor.continue();
		}

		for (const m of memberships) {
			await tx.store.put({ ...m, scopeId } as any);
		}
		await tx.done;
	} catch (e) {
		console.warn('[cache] writeGroupMemberships failed', e);
	}
}

export async function writeMeta(meta: CacheMeta): Promise<void> {
	try {
		const db = await getDb();
		await db.put('meta', meta);
	} catch (e) {
		console.warn('[cache] writeMeta failed', e);
	}
}

// ── Clear helpers ───────────────────────────────────────────────────

export async function clear(scopeId: ScopeId): Promise<void> {
	try {
		const db = await getDb();

		const stores = ['balances', 'trusts', 'transactions', 'groupMemberships'] as const;
		for (const storeName of stores) {
			const tx = db.transaction(storeName, 'readwrite');
			const idx = tx.store.index('byScopeId');
			let cursor = await idx.openKeyCursor(scopeId);
			while (cursor) {
				await tx.store.delete(cursor.primaryKey);
				cursor = await cursor.continue();
			}
			await tx.done;
		}

		await db.delete('meta', scopeId);
	} catch (e) {
		console.warn('[cache] clear failed', e);
	}
}

export async function clearAll(): Promise<void> {
	try {
		const db = await getDb();
		const stores = ['meta', 'balances', 'trusts', 'transactions', 'profiles', 'groupMemberships'] as const;
		for (const storeName of stores) {
			await db.clear(storeName);
		}
	} catch (e) {
		console.warn('[cache] clearAll failed', e);
	}
}
