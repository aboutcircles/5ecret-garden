import { browser } from '$app/environment';
import { get, writable, type Readable } from 'svelte/store';

export interface ProfileBookmark {
  address: string;
  createdAt: number;
  note?: string;
}

export interface BookmarksState {
  profiles: ProfileBookmark[];
  products: string[];
}

export interface BookmarksRepository {
  load(): BookmarksState;
  save(state: BookmarksState): void;
}

export interface ProfileBookmarksService {
  subscribe(run: (state: BookmarksState) => void): () => void;
  getState(): BookmarksState;
  getProfileBookmark(address: string | null | undefined): ProfileBookmark | undefined;
  isProfileBookmarked(address: string | null | undefined): boolean;
  upsertProfile(address: string, note?: string): ProfileBookmark | undefined;
  removeProfile(address: string): void;
  toggleProfile(address: string, note?: string): boolean;
}

const STORAGE_KEY = 'Circles.Bookmarks';

const EMPTY_STATE: BookmarksState = {
  profiles: [],
  products: [],
};

function normalizeProfileAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const v = String(address).trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(v)) return null;
  return v;
}

function normalizeNote(note: string | null | undefined): string | undefined {
  if (typeof note !== 'string') return undefined;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeProfileBookmark(input: unknown): ProfileBookmark | null {
  if (typeof input === 'string') {
    const address = normalizeProfileAddress(input);
    if (!address) return null;
    return {
      address,
      createdAt: Date.now(),
    };
  }

  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const address = normalizeProfileAddress(raw.address as string | undefined);
  if (!address) return null;

  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) && raw.createdAt > 0
      ? raw.createdAt
      : Date.now();

  return {
    address,
    createdAt,
    note: normalizeNote(raw.note as string | undefined),
  };
}

function sanitizeState(state: Partial<BookmarksState> | null | undefined): BookmarksState {
  const profiles: ProfileBookmark[] = [];
  const seenProfiles = new Set<string>();
  if (Array.isArray(state?.profiles)) {
    for (const raw of state!.profiles) {
      const next = normalizeProfileBookmark(raw);
      if (!next || seenProfiles.has(next.address)) continue;
      seenProfiles.add(next.address);
      profiles.push(next);
    }
  }

  const products = Array.isArray(state?.products)
    ? Array.from(new Set(state!.products.map((v) => String(v).trim()).filter((v) => v.length > 0)))
    : [];

  return { profiles, products };
}

class LocalStorageBookmarksRepository implements BookmarksRepository {
  load(): BookmarksState {
    if (!browser) return EMPTY_STATE;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return EMPTY_STATE;
      return sanitizeState(JSON.parse(raw));
    } catch {
      return EMPTY_STATE;
    }
  }

  save(state: BookmarksState): void {
    if (!browser) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
    } catch {
      // ignore storage failures (quota, privacy mode, etc.)
    }
  }
}

function createProfileBookmarksService(repository: BookmarksRepository): ProfileBookmarksService {
  const store = writable<BookmarksState>(repository.load());

  const persist = (next: BookmarksState): BookmarksState => {
    const sanitized = sanitizeState(next);
    repository.save(sanitized);
    return sanitized;
  };

  const setWith = (updater: (current: BookmarksState) => BookmarksState): void => {
    store.update((current) => persist(updater(current)));
  };

  return {
    subscribe: store.subscribe,
    getState(): BookmarksState {
      return get(store);
    },
    getProfileBookmark(address: string | null | undefined): ProfileBookmark | undefined {
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return undefined;
      return get(store).profiles.find((v) => v.address === normalized);
    },
    isProfileBookmarked(address: string | null | undefined): boolean {
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return false;
      return get(store).profiles.some((v) => v.address === normalized);
    },
    upsertProfile(address: string, note?: string): ProfileBookmark | undefined {
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return undefined;

      const normalizedNote = normalizeNote(note);
      let saved: ProfileBookmark | undefined;
      setWith((current) => {
        const existing = current.profiles.find((v) => v.address === normalized);
        if (existing) {
          saved = { ...existing, note: normalizedNote };
          return {
            ...current,
            profiles: current.profiles.map((v) => (v.address === normalized ? saved! : v)),
          };
        }

        saved = {
          address: normalized,
          createdAt: Date.now(),
          note: normalizedNote,
        };
        return {
          ...current,
          profiles: [...current.profiles, saved!],
        };
      });
      return saved;
    },
    removeProfile(address: string): void {
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return;
      setWith((current) => {
        if (!current.profiles.some((v) => v.address === normalized)) return current;
        return {
          ...current,
          profiles: current.profiles.filter((v) => v.address !== normalized),
        };
      });
    },
    toggleProfile(address: string, note?: string): boolean {
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return false;
      const normalizedNote = normalizeNote(note);

      let nowBookmarked = false;
      setWith((current) => {
        const existing = current.profiles.find((v) => v.address === normalized);
        const exists = !!existing;
        nowBookmarked = !exists;
        return {
          ...current,
          profiles: exists
            ? current.profiles.filter((v) => v.address !== normalized)
            : [
                ...current.profiles,
                {
                  address: normalized,
                  createdAt: Date.now(),
                  note: normalizedNote,
                },
              ],
        };
      });
      return nowBookmarked;
    },
  };
}

export const profileBookmarksService = createProfileBookmarksService(new LocalStorageBookmarksRepository());

export const profileBookmarksStore: Readable<ProfileBookmark[]> = {
  subscribe(run: (value: ProfileBookmark[]) => void) {
    return profileBookmarksService.subscribe((state) => run(state.profiles));
  },
};
