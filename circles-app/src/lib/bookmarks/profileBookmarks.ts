import { browser } from '$app/environment';
import { get, writable, type Readable } from 'svelte/store';

export interface ProfileBookmark {
  address: string;
  createdAt: number;
  note?: string;
  folder?: string;
}

export const VIP_BOOKMARK_FOLDER = 'VIPs';

export interface BookmarksState {
  profiles: ProfileBookmark[];
  products: string[];
  folders: string[];
}

interface PersistedBookmarksState {
  owners?: Record<string, Partial<BookmarksState>>;
  // legacy, app-global shape
  profiles?: unknown[];
  products?: unknown[];
  folders?: unknown[];
}

type LooseBookmarksState = {
  profiles?: unknown[];
  products?: unknown[];
  folders?: unknown[];
};

export interface BookmarksRepository {
  load(): PersistedBookmarksState;
  save(state: PersistedBookmarksState): void;
}

export interface ProfileBookmarksService {
  subscribe(run: (state: BookmarksState) => void): () => void;
  getState(): BookmarksState;
  getProfileFolders(): string[];
  getProfileBookmark(address: string | null | undefined): ProfileBookmark | undefined;
  isProfileBookmarked(address: string | null | undefined): boolean;
  upsertProfile(address: string, note?: string): ProfileBookmark | undefined;
  upsertProfile(
    address: string,
    input?: {
      note?: string;
      folder?: string | null;
    }
  ): ProfileBookmark | undefined;
  removeProfile(address: string): void;
  ensureProfileFolder(name: string): string | undefined;
  removeProfileFolder(name: string): void;
}

const STORAGE_KEY = 'Circles.Bookmarks';
const CIRCLES_STORAGE_KEY = 'Circles.Storage';
const DEFAULT_OWNER_KEY = '__default__';

const EMPTY_OWNER_STATE: BookmarksState = {
  profiles: [],
  products: [],
  folders: [],
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

function normalizeFolderName(folder: string | null | undefined): string | undefined {
  if (typeof folder !== 'string') return undefined;
  const trimmed = folder.trim().replace(/\s+/g, ' ');
  if (!trimmed) return undefined;
  const normalized = trimmed.slice(0, 64);
  if (folderKey(normalized) === folderKey(VIP_BOOKMARK_FOLDER)) {
    return VIP_BOOKMARK_FOLDER;
  }
  return normalized;
}

function folderKey(folder: string): string {
  return folder.toLowerCase();
}

function isFolderOrDescendant(folder: string | undefined, targetFolder: string): boolean {
  if (!folder) return false;
  const f = folderKey(folder);
  const t = folderKey(targetFolder);
  return f === t || f.startsWith(`${t}/`);
}

export function isVipProfileBookmark(bookmark: ProfileBookmark | null | undefined): boolean {
  if (!bookmark?.folder) return false;
  return folderKey(bookmark.folder) === folderKey(VIP_BOOKMARK_FOLDER);
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
    folder: normalizeFolderName(raw.folder as string | undefined),
  };
}

function sanitizeOwnerState(
  state: Partial<BookmarksState> | LooseBookmarksState | null | undefined
): BookmarksState {
  const stateProfiles = state?.profiles;
  const stateFolders = state?.folders;
  const stateProducts = state?.products;

  const profiles: ProfileBookmark[] = [];
  const seenProfiles = new Set<string>();
  const rawProfiles: unknown[] = Array.isArray(stateProfiles) ? stateProfiles : [];
  for (const raw of rawProfiles) {
    const next = normalizeProfileBookmark(raw);
    if (!next || seenProfiles.has(next.address)) continue;
    seenProfiles.add(next.address);
    profiles.push(next);
  }

  const folders: string[] = [];
  const seenFolders = new Set<string>();
  const rawFolders: unknown[] = Array.isArray(stateFolders) ? stateFolders : [];
  for (const raw of rawFolders) {
    const next = normalizeFolderName(String(raw));
    if (!next) continue;
    const key = folderKey(next);
    if (seenFolders.has(key)) continue;
    seenFolders.add(key);
    folders.push(next);
  }

  for (const profile of profiles) {
    if (!profile.folder) continue;
    const key = folderKey(profile.folder);
    if (seenFolders.has(key)) continue;
    seenFolders.add(key);
    folders.push(profile.folder);
  }

  if (!seenFolders.has(folderKey(VIP_BOOKMARK_FOLDER))) {
    seenFolders.add(folderKey(VIP_BOOKMARK_FOLDER));
    folders.push(VIP_BOOKMARK_FOLDER);
  }

  const rawProducts: unknown[] = Array.isArray(stateProducts) ? stateProducts : [];
  const normalizedProducts = rawProducts
    .reduce<string[]>((acc, value) => {
      const next = String(value).trim();
      if (next.length > 0) acc.push(next);
      return acc;
    }, []);
  const products = Array.from(new Set(normalizedProducts));

  return { profiles, products, folders };
}

function sanitizePersistedState(state: PersistedBookmarksState | null | undefined): PersistedBookmarksState {
  const owners: Record<string, BookmarksState> = {};

  if (state?.owners && typeof state.owners === 'object') {
    for (const [owner, ownerState] of Object.entries(state.owners)) {
      const normalizedOwner = normalizeProfileAddress(owner);
      if (!normalizedOwner) continue;
      owners[normalizedOwner] = sanitizeOwnerState(ownerState);
    }
  }

  // migrate old app-global shape into current connected owner
  const hasLegacyData =
    Array.isArray(state?.profiles) || Array.isArray(state?.products) || Array.isArray(state?.folders);
  if (hasLegacyData) {
    const owner = getConnectedOwnerKey();
    const current = owners[owner] ?? EMPTY_OWNER_STATE;
    owners[owner] = sanitizeOwnerState({
      profiles: [...(current.profiles ?? []), ...(Array.isArray(state?.profiles) ? state!.profiles : [])],
      products: [...(current.products ?? []), ...(Array.isArray(state?.products) ? state!.products : [])],
      folders: [...(current.folders ?? []), ...(Array.isArray(state?.folders) ? state!.folders : [])],
    });
  }

  return { owners };
}

function resolveOwnerState(state: PersistedBookmarksState, ownerKey: string): BookmarksState {
  const fromOwners = state.owners?.[ownerKey];
  if (fromOwners) return sanitizeOwnerState(fromOwners);
  return EMPTY_OWNER_STATE;
}

function getConnectedOwnerKey(): string {
  if (!browser) return DEFAULT_OWNER_KEY;

  try {
    const raw = window.localStorage.getItem(CIRCLES_STORAGE_KEY);
    if (!raw) return DEFAULT_OWNER_KEY;
    const data = JSON.parse(raw) as { avatar?: string; group?: string };
    const addr = normalizeProfileAddress(data?.group ?? data?.avatar ?? null);
    return addr ?? DEFAULT_OWNER_KEY;
  } catch {
    return DEFAULT_OWNER_KEY;
  }
}

function parseUpsertInput(
  input?:
    | string
    | {
        note?: string;
        folder?: string | null;
      }
): {
  hasNote: boolean;
  note: string | undefined;
  hasFolder: boolean;
  folder: string | undefined;
} {
  if (typeof input === 'string') {
    return {
      hasNote: true,
      note: normalizeNote(input),
      hasFolder: false,
      folder: undefined,
    };
  }

  if (!input || typeof input !== 'object') {
    return {
      hasNote: false,
      note: undefined,
      hasFolder: false,
      folder: undefined,
    };
  }

  return {
    hasNote: Object.prototype.hasOwnProperty.call(input, 'note'),
    note: normalizeNote(input.note),
    hasFolder: Object.prototype.hasOwnProperty.call(input, 'folder'),
    folder: normalizeFolderName(input.folder),
  };
}

class LocalStorageBookmarksRepository implements BookmarksRepository {
  load(): PersistedBookmarksState {
    if (!browser) return { owners: {} };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { owners: {} };
      return sanitizePersistedState(JSON.parse(raw));
    } catch {
      return { owners: {} };
    }
  }

  save(state: PersistedBookmarksState): void {
    if (!browser) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizePersistedState(state)));
    } catch {
      // ignore storage failures (quota, privacy mode, etc.)
    }
  }
}

function createProfileBookmarksService(repository: BookmarksRepository): ProfileBookmarksService {
  let activeOwnerKey = getConnectedOwnerKey();
  const persisted = writable<PersistedBookmarksState>(repository.load());
  const current = writable<BookmarksState>(resolveOwnerState(get(persisted), activeOwnerKey));

  const syncOwner = (): void => {
    const nextOwner = getConnectedOwnerKey();
    if (nextOwner === activeOwnerKey) return;
    activeOwnerKey = nextOwner;
    current.set(resolveOwnerState(get(persisted), activeOwnerKey));
  };

  const persistAll = (next: PersistedBookmarksState): PersistedBookmarksState => {
    const sanitized = sanitizePersistedState(next);
    repository.save(sanitized);
    return sanitized;
  };

  const updateCurrent = (updater: (value: BookmarksState) => BookmarksState): void => {
    syncOwner();
    persisted.update((all) => {
      const ownerState = resolveOwnerState(all, activeOwnerKey);
      const nextOwnerState = sanitizeOwnerState(updater(ownerState));
      const nextAll = persistAll({
        ...all,
        owners: {
          ...(all.owners ?? {}),
          [activeOwnerKey]: nextOwnerState,
        },
      });
      current.set(resolveOwnerState(nextAll, activeOwnerKey));
      return nextAll;
    });
  };

  // keep state aligned when connection changes while app is running
  let subscriberCount = 0;
  let ownerWatchTimer: ReturnType<typeof setInterval> | null = null;
  const startOwnerWatch = (): void => {
    if (!browser || ownerWatchTimer) return;
    ownerWatchTimer = setInterval(syncOwner, 1200);
  };
  const stopOwnerWatch = (): void => {
    if (!ownerWatchTimer) return;
    clearInterval(ownerWatchTimer);
    ownerWatchTimer = null;
  };

  return {
    subscribe(run: (state: BookmarksState) => void): () => void {
      syncOwner();
      subscriberCount += 1;
      startOwnerWatch();
      const unsubscribe = current.subscribe(run);
      return () => {
        unsubscribe();
        subscriberCount = Math.max(0, subscriberCount - 1);
        if (subscriberCount === 0) stopOwnerWatch();
      };
    },
    getState(): BookmarksState {
      syncOwner();
      return get(current);
    },
    getProfileFolders(): string[] {
      syncOwner();
      return [...get(current).folders];
    },
    getProfileBookmark(address: string | null | undefined): ProfileBookmark | undefined {
      syncOwner();
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return undefined;
      return get(current).profiles.find((v) => v.address === normalized);
    },
    isProfileBookmarked(address: string | null | undefined): boolean {
      syncOwner();
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return false;
      return get(current).profiles.some((v) => v.address === normalized);
    },
    upsertProfile(
      address: string,
      input?:
        | string
        | {
            note?: string;
            folder?: string | null;
          }
    ): ProfileBookmark | undefined {
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return undefined;

      const parsed = parseUpsertInput(input);
      let saved: ProfileBookmark | undefined;
      updateCurrent((state) => {
        const existing = state.profiles.find((v) => v.address === normalized);
        const nextFolder = parsed.hasFolder ? parsed.folder : existing?.folder;
        const nextNote = parsed.hasNote ? parsed.note : existing?.note;

        let nextFolders = state.folders;
        if (nextFolder) {
          const key = folderKey(nextFolder);
          if (!state.folders.some((v) => folderKey(v) === key)) {
            nextFolders = [...state.folders, nextFolder];
          }
        }

        if (existing) {
          saved = { ...existing, note: nextNote, folder: nextFolder };
          return {
            ...state,
            folders: nextFolders,
            profiles: state.profiles.map((v) => (v.address === normalized ? saved! : v)),
          };
        }

        saved = {
          address: normalized,
          createdAt: Date.now(),
          note: nextNote,
          folder: nextFolder,
        };
        return {
          ...state,
          folders: nextFolders,
          profiles: [...state.profiles, saved!],
        };
      });
      return saved;
    },
    removeProfile(address: string): void {
      const normalized = normalizeProfileAddress(address);
      if (!normalized) return;
      updateCurrent((state) => {
        if (!state.profiles.some((v) => v.address === normalized)) return state;
        return {
          ...state,
          profiles: state.profiles.filter((v) => v.address !== normalized),
        };
      });
    },
    ensureProfileFolder(name: string): string | undefined {
      const normalized = normalizeFolderName(name);
      if (!normalized) return undefined;

      let saved = normalized;
      updateCurrent((state) => {
        const existing = state.folders.find((v) => folderKey(v) === folderKey(normalized));
        if (existing) {
          saved = existing;
          return state;
        }

        return {
          ...state,
          folders: [...state.folders, normalized],
        };
      });

      return saved;
    },
    removeProfileFolder(name: string): void {
      const normalized = normalizeFolderName(name);
      if (!normalized) return;
      if (folderKey(normalized) === folderKey(VIP_BOOKMARK_FOLDER)) return;

      updateCurrent((state) => {
        const nextProfiles = state.profiles.map((profile) => {
          if (!isFolderOrDescendant(profile.folder, normalized)) return profile;
          return { ...profile, folder: undefined };
        });

        const nextFolders = state.folders.filter((folder) => !isFolderOrDescendant(folder, normalized));

        return {
          ...state,
          profiles: nextProfiles,
          folders: nextFolders,
        };
      });
    },
  };
}

export const profileBookmarksService = createProfileBookmarksService(new LocalStorageBookmarksRepository());

export const profileBookmarksStore: Readable<ProfileBookmark[]> = {
  subscribe(run: (value: ProfileBookmark[]) => void) {
    return profileBookmarksService.subscribe((state) => run(state.profiles));
  },
};

export const bookmarksStateStore: Readable<BookmarksState> = {
  subscribe(run: (value: BookmarksState) => void) {
    return profileBookmarksService.subscribe(run);
  },
};
