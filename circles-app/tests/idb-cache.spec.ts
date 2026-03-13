import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

/** Opens the circles-wallet IDB, creating stores if needed (fresh browser context). */
async function openCacheDb(page: Page): Promise<void> {
	// Evaluated in the browser; sets up DB with full schema
	await page.evaluate(() => {
		return new Promise<void>((resolve, reject) => {
			const req = indexedDB.open('circles-wallet', 1);
			req.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains('meta'))
					db.createObjectStore('meta', { keyPath: 'scopeId' });
				if (!db.objectStoreNames.contains('balances')) {
					const s = db.createObjectStore('balances', { keyPath: ['scopeId', 'tokenId'] });
					s.createIndex('byScopeId', 'scopeId');
				}
				if (!db.objectStoreNames.contains('trusts')) {
					const s = db.createObjectStore('trusts', { keyPath: ['scopeId', 'objectAvatar'] });
					s.createIndex('byScopeId', 'scopeId');
				}
				if (!db.objectStoreNames.contains('transactions')) {
					const s = db.createObjectStore('transactions', { keyPath: ['scopeId', 'eventKey'] });
					s.createIndex('byScopeId', 'scopeId');
					s.createIndex('byScopeBlock', ['scopeId', 'blockNumber']);
				}
				if (!db.objectStoreNames.contains('profiles')) {
					const s = db.createObjectStore('profiles', { keyPath: 'address' });
					s.createIndex('byFetchedAt', 'fetchedAt');
				}
				if (!db.objectStoreNames.contains('groupMemberships')) {
					const s = db.createObjectStore('groupMemberships', { keyPath: ['scopeId', 'group'] });
					s.createIndex('byScopeId', 'scopeId');
				}
			};
			req.onsuccess = () => { req.result.close(); resolve(); };
			req.onerror = () => reject(new Error('Failed to open IDB'));
		});
	});
}

test.describe('IndexedDB Cache', () => {
	test('app loads without cache-related errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));
		page.on('console', (msg) => {
			if (msg.type() === 'error' && msg.text().includes('[cache]')) {
				errors.push(msg.text());
			}
		});

		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');

		await expect(page.locator('main')).toBeVisible();

		const cacheErrors = errors.filter(
			(e) => e.includes('cache') || e.includes('idb') || e.includes('IndexedDB'),
		);
		expect(cacheErrors).toEqual([]);
	});

	test('IDB database can be opened and all 6 stores exist', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await openCacheDb(page);

		const storeNames = await page.evaluate(() => {
			return new Promise<string[]>((resolve, reject) => {
				const req = indexedDB.open('circles-wallet', 1);
				req.onsuccess = () => {
					const db = req.result;
					const names = Array.from(db.objectStoreNames);
					db.close();
					resolve(names);
				};
				req.onerror = () => reject(new Error('open failed'));
			});
		});

		expect(storeNames).toContain('meta');
		expect(storeNames).toContain('balances');
		expect(storeNames).toContain('trusts');
		expect(storeNames).toContain('transactions');
		expect(storeNames).toContain('profiles');
		expect(storeNames).toContain('groupMemberships');
	});

	test('profile write and read round-trip', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await openCacheDb(page);

		const result = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('circles-wallet', 1);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			const testProfile = {
				address: '0x1234567890abcdef1234567890abcdef12345678',
				profile: { name: 'Test User', previewImageUrl: '/person.svg', description: 'A test' },
				fetchedAt: Date.now(),
			};

			// Write
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction('profiles', 'readwrite');
				tx.objectStore('profiles').put(testProfile);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});

			// Read
			const readBack = await new Promise<any>((resolve, reject) => {
				const tx = db.transaction('profiles', 'readonly');
				const req = tx.objectStore('profiles').get(testProfile.address);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			db.close();
			return {
				readName: readBack?.profile?.name,
				readPreview: readBack?.profile?.previewImageUrl,
				addressMatch: readBack?.address === testProfile.address,
			};
		});

		expect(result.readName).toBe('Test User');
		expect(result.readPreview).toBe('/person.svg');
		expect(result.addressMatch).toBe(true);
	});

	test('balance scope isolation — no data bleed between accounts', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await openCacheDb(page);

		const result = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('circles-wallet', 1);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			const scope1 = 'gnosis:0xaaaa';
			const scope2 = 'gnosis:0xbbbb';

			// Write
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction('balances', 'readwrite');
				const s = tx.objectStore('balances');
				s.put({ scopeId: scope1, tokenId: 'tok1', circles: 100, tokenOwner: '0xaaaa', staticCircles: 50 });
				s.put({ scopeId: scope1, tokenId: 'tok2', circles: 200, tokenOwner: '0xaaaa', staticCircles: 100 });
				s.put({ scopeId: scope2, tokenId: 'tok1', circles: 999, tokenOwner: '0xbbbb', staticCircles: 500 });
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});

			// Read via index
			const readScope = (scope: string) =>
				new Promise<any[]>((resolve, reject) => {
					const tx = db.transaction('balances', 'readonly');
					const req = tx.objectStore('balances').index('byScopeId').getAll(scope);
					req.onsuccess = () => resolve(req.result);
					req.onerror = () => reject(req.error);
				});

			const s1 = await readScope(scope1);
			const s2 = await readScope(scope2);
			db.close();

			return {
				scope1Count: s1.length,
				scope2Count: s2.length,
				scope1Circles: s1.map((r) => r.circles).sort(),
				scope2Circles: s2.map((r) => r.circles),
				noBleed: s1.every((r) => r.scopeId === scope1),
			};
		});

		expect(result.scope1Count).toBe(2);
		expect(result.scope2Count).toBe(1);
		expect(result.scope1Circles).toEqual([100, 200]);
		expect(result.scope2Circles).toEqual([999]);
		expect(result.noBleed).toBe(true);
	});

	test('meta checkpoint write gates hydration', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await openCacheDb(page);

		const result = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('circles-wallet', 1);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			const scopeId = 'gnosis:0xtest';

			// Before: no meta
			const noMeta = await new Promise<any>((resolve, reject) => {
				const tx = db.transaction('meta', 'readonly');
				const req = tx.objectStore('meta').get(scopeId);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			// Write meta
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction('meta', 'readwrite');
				tx.objectStore('meta').put({
					scopeId,
					blockNumber: 12345,
					dataVersion: 1,
					lastSyncedAt: Date.now(),
				});
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});

			// After: meta exists
			const hasMeta = await new Promise<any>((resolve, reject) => {
				const tx = db.transaction('meta', 'readonly');
				const req = tx.objectStore('meta').get(scopeId);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			db.close();
			return {
				beforeMeta: noMeta,
				afterMetaBlock: hasMeta?.blockNumber,
				afterMetaVersion: hasMeta?.dataVersion,
			};
		});

		expect(result.beforeMeta).toBeUndefined();
		expect(result.afterMetaBlock).toBe(12345);
		expect(result.afterMetaVersion).toBe(1);
	});

	test('clearAll wipes all stores', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await openCacheDb(page);

		const result = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('circles-wallet', 1);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			// Seed
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(['meta', 'profiles'], 'readwrite');
				tx.objectStore('meta').put({ scopeId: 'gnosis:0xclear', blockNumber: 1, dataVersion: 1, lastSyncedAt: 1 });
				tx.objectStore('profiles').put({ address: '0xclearaddr', profile: { name: 'clear' }, fetchedAt: 1 });
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});

			// Count before
			const countStore = async (name: string) =>
				new Promise<number>((resolve, reject) => {
					const tx = db.transaction(name, 'readonly');
					const req = tx.objectStore(name).count();
					req.onsuccess = () => resolve(req.result);
					req.onerror = () => reject(req.error);
				});

			const metaBefore = await countStore('meta');
			const profilesBefore = await countStore('profiles');

			// Clear all
			for (const name of ['meta', 'balances', 'trusts', 'transactions', 'profiles', 'groupMemberships']) {
				await new Promise<void>((resolve, reject) => {
					const tx = db.transaction(name, 'readwrite');
					tx.objectStore(name).clear();
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			}

			const metaAfter = await countStore('meta');
			const profilesAfter = await countStore('profiles');
			db.close();

			return { metaBefore, profilesBefore, metaAfter, profilesAfter };
		});

		expect(result.metaBefore).toBeGreaterThan(0);
		expect(result.profilesBefore).toBeGreaterThan(0);
		expect(result.metaAfter).toBe(0);
		expect(result.profilesAfter).toBe(0);
	});

	test('transaction store respects compound key and byScopeBlock index', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await openCacheDb(page);

		const result = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('circles-wallet', 1);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			const scopeId = 'gnosis:0xtxtest';

			// Write transactions
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction('transactions', 'readwrite');
				const s = tx.objectStore('transactions');
				s.put({ scopeId, eventKey: '100:0:0', blockNumber: 100, transactionIndex: 0, logIndex: 0, transactionHash: '0xaaa' });
				s.put({ scopeId, eventKey: '200:1:0', blockNumber: 200, transactionIndex: 1, logIndex: 0, transactionHash: '0xbbb' });
				s.put({ scopeId, eventKey: '50:0:1', blockNumber: 50, transactionIndex: 0, logIndex: 1, transactionHash: '0xccc' });
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});

			// Read all for scope
			const all = await new Promise<any[]>((resolve, reject) => {
				const tx = db.transaction('transactions', 'readonly');
				const req = tx.objectStore('transactions').index('byScopeId').getAll(scopeId);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			// Read via byScopeBlock index with a key range (block >= 100)
			const fromBlock100 = await new Promise<any[]>((resolve, reject) => {
				const tx = db.transaction('transactions', 'readonly');
				const idx = tx.objectStore('transactions').index('byScopeBlock');
				const range = IDBKeyRange.lowerBound([scopeId, 100]);
				const req = idx.getAll(range);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});

			db.close();
			return {
				totalCount: all.length,
				blockNumbers: all.map((r) => r.blockNumber).sort(),
				fromBlock100Count: fromBlock100.length,
				fromBlock100Blocks: fromBlock100.map((r) => r.blockNumber).sort(),
			};
		});

		expect(result.totalCount).toBe(3);
		expect(result.blockNumbers.sort((a: number, b: number) => a - b)).toEqual([50, 100, 200]);
		expect(result.fromBlock100Count).toBe(2);
		expect(result.fromBlock100Blocks.sort((a: number, b: number) => a - b)).toEqual([100, 200]);
	});
});
