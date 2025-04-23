import type {
  AvatarRow,
  CirclesEventType,
  TrustRelationRow,
} from '@circles-sdk/data';
import type { Profile } from '@circles-sdk/profiles';
import { writable } from 'svelte/store';
import { createContactsQueryStore } from './query/circlesContactsQueryStore.svelte';
import type { Avatar } from '@circles-sdk/sdk';

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

  currentQuery = createContactsQueryStore($avatar, $avatar.address, refreshOnEvents);
  currentQuery.then((store) => {
    currentStoreUnsubscribe = store.subscribe(contacts.set);
  });
}


