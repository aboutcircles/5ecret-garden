import { getDb } from './db';
import { PROFILE_TTL_MS } from './constants';
import type { AppProfileCore } from '$lib/shared/model/profile/types';
import type { CachedProfile } from './schema';

/**
 * Read a single profile from IDB.
 * Returns undefined if not found or stale (older than TTL).
 */
export async function readProfile(address: string): Promise<AppProfileCore | undefined> {
	try {
		const db = await getDb();
		const entry = await db.get('profiles', address.toLowerCase());
		if (!entry) return undefined;
		if (Date.now() - entry.fetchedAt > PROFILE_TTL_MS) return undefined;
		return entry.profile;
	} catch {
		return undefined;
	}
}

/**
 * Batch-read profiles from IDB.
 * Returns a Map of address → AppProfileCore for all found & fresh entries.
 * Missing or stale addresses are simply omitted from the result.
 */
export async function readProfilesBatch(
	addresses: string[],
): Promise<Map<string, AppProfileCore>> {
	const result = new Map<string, AppProfileCore>();
	try {
		const db = await getDb();
		const now = Date.now();
		const tx = db.transaction('profiles', 'readonly');

		const entries = await Promise.all(
			addresses.map((a) => tx.store.get(a.toLowerCase())),
		);
		await tx.done;

		for (const entry of entries) {
			if (!entry) continue;
			if (now - entry.fetchedAt > PROFILE_TTL_MS) continue;
			result.set(entry.address, entry.profile);
		}
	} catch {
		// graceful degradation
	}
	return result;
}

/**
 * Write profiles to IDB (fire-and-forget friendly).
 */
export async function persistProfiles(
	profiles: Map<string, AppProfileCore>,
): Promise<void> {
	try {
		const db = await getDb();
		const tx = db.transaction('profiles', 'readwrite');
		const now = Date.now();

		for (const [address, profile] of profiles) {
			const entry: CachedProfile = {
				address: address.toLowerCase(),
				profile,
				fetchedAt: now,
			};
			await tx.store.put(entry);
		}
		await tx.done;
	} catch {
		// graceful degradation
	}
}
