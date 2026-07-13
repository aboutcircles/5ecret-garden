import type {
  AvatarRow,
  AvatarInfo,
  CirclesEventType,
  TrustRelationRow,
  AggregatedTrustRelation,
} from '@aboutcircles/sdk-types';
import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
import { writable } from 'svelte/store';
import { createContactsQueryStore } from '$lib/shared/state/contacts/query/circlesContactsQueryStore.svelte';
import type { Avatar } from '@aboutcircles/sdk';
import { writeTrusts, persistProfiles, makeScopeId } from '$lib/shared/cache';
import type { ProfileAddress } from '$lib/shared/model/profile/types';

export type ContactListItem = {
  contactProfile: Profile;
  avatarInfo?: AvatarRow | AvatarInfo;
  row: TrustRelationRow | AggregatedTrustRelation;
};

export type ContactList = Record<string, ContactListItem>;

const refreshOnEvents = new Set<string>([
  'CrcV1_Trust',
  'CrcV2_Trust',
  'CrcV2_InviteHuman',
]) as Set<CirclesEventType>;

let currentStoreUnsubscribe: (() => void) | undefined;
let currentQuery: Promise<any> | undefined;
let currentAvatarAddress: string = '';
// Bumped on every (re-)init. The query store resolves asynchronously, so we stamp each init
// with a generation and, when its promise finally settles, discard the subscription if a newer
// init has superseded it. Without this a rapid re-init (e.g. a liveness tick firing while the
// previous query is still in flight) finds `currentStoreUnsubscribe` still undefined, skips the
// teardown below, and orphans the earlier `avatar.events` subscription forever.
let initGeneration = 0;

export const contacts = writable<{
  data: ContactList;
  next: () => Promise<boolean>;
  ended: boolean;
  // `initialLoaded` flips true once the first page has loaded (success or empty);
  // `initialLoadError` true when that initial load failed. Consumers use these —
  // NOT `ended` (a pagination-exhaustion flag) — to tell loading from empty.
  initialLoaded: boolean;
  initialLoadError: boolean;
}>({ data: {}, next: async () => false, ended: false, initialLoaded: false, initialLoadError: false });

export const initContactStore = ($avatar: Avatar) => {
  // Skip re-init if already initialized for this avatar
  if (currentAvatarAddress === $avatar.address && currentStoreUnsubscribe) {
    return;
  }

  if (currentStoreUnsubscribe) {
    currentStoreUnsubscribe();
    currentStoreUnsubscribe = undefined;
  }

  const myGeneration = ++initGeneration;
  currentQuery = undefined;
  currentAvatarAddress = $avatar.address;

  const scopeId = makeScopeId($avatar.address);
  currentQuery = createContactsQueryStore($avatar, $avatar.address, refreshOnEvents);
  currentQuery.then((store) => {
    // If a newer init superseded this query while it was in flight, do NOT subscribe. The
    // contacts query store is lazy — its `avatar.events` subscription only starts on the first
    // `.subscribe()` (eventStoreFactory) — so never subscribing means there is nothing to leak.
    // (Subscribing and then synchronously unsubscribing would race that async event-wiring and
    // orphan the subscription created after our teardown ran.)
    if (myGeneration !== initGeneration) return;

    currentStoreUnsubscribe = store.subscribe((value: {
      data: ContactList;
      next: () => Promise<boolean>;
      ended: boolean;
      initialLoaded: boolean;
      initialLoadError: boolean;
    }) => {
      contacts.set(value);

      // Write-through: persist trust relations and profiles to IDB
      const entries: ContactListItem[] = Object.values(value.data);
      if (entries.length > 0) {
        const trustRows = entries.map((item) => item.row);
        void writeTrusts(scopeId, trustRows as any[]);

        const profileMap = new Map<string, Profile>();
        for (const item of entries) {
          const addr = item.row.objectAvatar!.toLowerCase() as ProfileAddress;
          profileMap.set(addr, item.contactProfile);
        }
        void persistProfiles(profileMap);
      }
    });
  });
};

/**
 * Force-refresh the contact store, bypassing the dedup guard.
 * Call this after trust/untrust operations so new contacts appear.
 */
export const refreshContactStore = ($avatar: Avatar) => {
  currentAvatarAddress = '';
  initContactStore($avatar);
};


