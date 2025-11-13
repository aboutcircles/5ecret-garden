import type { AvatarInfo, AggregatedTrustRelation } from '@aboutcircles/sdk-types';
import type { CirclesEventType } from '@aboutcircles/sdk-rpc';
import type { Profile } from '@aboutcircles/sdk-types';
import { writable } from 'svelte/store';
import { createContactsQueryStore } from './query/circlesContactsQueryStore.svelte';
import type { Avatar } from '@aboutcircles/sdk';

export type ContactListItem = {
  contactProfile: Profile;
  avatarInfo?: AvatarInfo;
  row: AggregatedTrustRelation;
};

export type ContactList = Record<string, ContactListItem>;

const refreshOnEvents: Set<CirclesEventType> = new Set([
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

  currentQuery = createContactsQueryStore(
    $avatar,
    $avatar.address,
    refreshOnEvents
  );
  currentQuery.then((store) => {
    currentStoreUnsubscribe = store.subscribe(contacts.set);
  });
};
