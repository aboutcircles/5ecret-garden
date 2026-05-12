import type { DBSchema } from 'idb';
import type { AppProfileCore } from '$lib/shared/model/profile/types';

// ── Row types stored in IDB ─────────────────────────────────────────

export interface CachedBalance {
	tokenId: string;
	tokenOwner: string;
	circles: number;
	staticCircles: number;
	[k: string]: unknown;
}

export interface CachedTrust {
	subjectAvatar: string;
	objectAvatar: string;
	relation: string;
	[k: string]: unknown;
}

export interface CachedTransaction {
	blockNumber: number;
	transactionIndex: number;
	logIndex: number;
	transactionHash: string;
	[k: string]: unknown;
}

export interface CachedProfile {
	address: string;
	profile: AppProfileCore;
	fetchedAt: number;
}

export interface CachedGroupMembership {
	group: string;
	member: string;
	expiryTime: number;
	[k: string]: unknown;
}

export interface CacheMeta {
	scopeId: string;
	blockNumber: number;
	dataVersion: number;
	lastSyncedAt: number;
}

// ── Composite key helpers ───────────────────────────────────────────

/** Scope key: `gnosis:<lowercaseAddress>` */
export type ScopeId = `gnosis:${string}`;

export function makeScopeId(address: string): ScopeId {
	return `gnosis:${address.toLowerCase()}`;
}

// ── IDB schema (typed via `idb` generics) ───────────────────────────

export interface CirclesCacheSchema extends DBSchema {
	meta: {
		key: string; // scopeId
		value: CacheMeta;
	};
	balances: {
		key: [string, string]; // [scopeId, tokenId]
		value: CachedBalance & { scopeId: string };
		indexes: { byScopeId: string };
	};
	trusts: {
		key: [string, string]; // [scopeId, objectAvatar]
		value: CachedTrust & { scopeId: string };
		indexes: { byScopeId: string };
	};
	transactions: {
		key: [string, string]; // [scopeId, eventKey]
		value: CachedTransaction & { scopeId: string; eventKey: string };
		indexes: {
			byScopeId: string;
			byScopeBlock: [string, number];
		};
	};
	profiles: {
		key: string; // address
		value: CachedProfile;
		indexes: { byFetchedAt: number };
	};
	groupMemberships: {
		key: [string, string]; // [scopeId, group]
		value: CachedGroupMembership & { scopeId: string };
		indexes: { byScopeId: string };
	};
}
