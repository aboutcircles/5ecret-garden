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


