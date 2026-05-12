import { openDB, type IDBPDatabase } from 'idb';
import type { CirclesCacheSchema } from './schema';
import { DB_NAME, DB_VERSION } from './constants';

let dbInstance: IDBPDatabase<CirclesCacheSchema> | undefined;

export async function getDb(): Promise<IDBPDatabase<CirclesCacheSchema>> {
	if (dbInstance) return dbInstance;

	dbInstance = await openDB<CirclesCacheSchema>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// meta — keyed by scopeId
			if (!db.objectStoreNames.contains('meta')) {
				db.createObjectStore('meta', { keyPath: 'scopeId' });
			}

			// balances — compound key [scopeId, tokenId]
			if (!db.objectStoreNames.contains('balances')) {
				const store = db.createObjectStore('balances', {
					keyPath: ['scopeId', 'tokenId'],
				});
				store.createIndex('byScopeId', 'scopeId');
			}

			// trusts — compound key [scopeId, objectAvatar]
			if (!db.objectStoreNames.contains('trusts')) {
				const store = db.createObjectStore('trusts', {
					keyPath: ['scopeId', 'objectAvatar'],
				});
				store.createIndex('byScopeId', 'scopeId');
			}

			// transactions — compound key [scopeId, eventKey]
			if (!db.objectStoreNames.contains('transactions')) {
				const store = db.createObjectStore('transactions', {
					keyPath: ['scopeId', 'eventKey'],
				});
				store.createIndex('byScopeId', 'scopeId');
				store.createIndex('byScopeBlock', ['scopeId', 'blockNumber']);
			}

			// profiles — global, keyed by address
			if (!db.objectStoreNames.contains('profiles')) {
				const store = db.createObjectStore('profiles', { keyPath: 'address' });
				store.createIndex('byFetchedAt', 'fetchedAt');
			}

			// groupMemberships — compound key [scopeId, group]
			if (!db.objectStoreNames.contains('groupMemberships')) {
				const store = db.createObjectStore('groupMemberships', {
					keyPath: ['scopeId', 'group'],
				});
				store.createIndex('byScopeId', 'scopeId');
			}
		},
	});

	return dbInstance;
}

/** Close and discard the cached connection (used in tests / hot-reload). */
export function closeDb(): void {
	dbInstance?.close();
	dbInstance = undefined;
}
