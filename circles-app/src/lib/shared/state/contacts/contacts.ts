import type {
  AvatarRow,
  CirclesEventType,
  TrustRelationRow,
} from '@circles-sdk/data';
import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
import { writable } from 'svelte/store';
import { createContactsQueryStore } from '$lib/shared/state/contacts/query/circlesContactsQueryStore.svelte';
import type { Avatar } from '@circles-sdk/sdk';
import { writeTrusts, persistProfiles, makeScopeId } from '$lib/shared/cache';
import type { ProfileAddress } from '$lib/shared/model/profile/types';

export type ContactListItem = {
  contactProfile: Profile;
  avatarInfo?: AvatarRow;
  row: TrustRelationRow;
};

export type ContactList = Record<string, ContactListItem>;

const refreshOnEvents: Set<CirclesEventType> = new Set([
  'CrcV1_Trust',
  'CrcV2_Trust',
  'CrcV2_InviteHuman',
]);

let currentStoreUnsubscribe: (() => void) | undefined;
let currentQuery: Promise<any> | undefined;

export const contacts = writable<{
  data: ContactList;
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: {}, next: async () => false, ended: false });

export const initContactStore = ($avatar: Avatar) => {
  if (currentStoreUnsubscribe) {
		currentStoreUnsubscribe();
		currentStoreUnsubscribe = undefined;
	}

	currentQuery = undefined;

  const scopeId = makeScopeId($avatar.address);
  currentQuery = createContactsQueryStore($avatar, $avatar.address, refreshOnEvents);
  currentQuery.then((store) => {
    currentStoreUnsubscribe = store.subscribe((value: {
      data: ContactList;
      next: () => Promise<boolean>;
      ended: boolean;
    }) => {
      contacts.set(value);

      // Write-through: persist trust relations and profiles to IDB
      const entries: ContactListItem[] = Object.values(value.data);
      if (entries.length > 0) {
        const trustRows = entries.map((item) => item.row);
        void writeTrusts(scopeId, trustRows);

        const profileMap = new Map<string, Profile>();
        for (const item of entries) {
          const addr = item.row.objectAvatar.toLowerCase() as ProfileAddress;
          profileMap.set(addr, item.contactProfile);
        }
        void persistProfiles(profileMap);
      }
    });
  });
}


