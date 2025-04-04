import { get } from 'svelte/store';
import { avatar } from '$lib/stores/avatar';
import type {
  AvatarRow,
  CirclesEventType,
  TrustRelationRow,
} from '@circles-sdk/data';
import type { Profile } from '@circles-sdk/profiles';
import { circles } from '$lib/stores/circles';
import { getProfile } from '$lib/utils/profile';
import { writable } from 'svelte/store';
import { createContactsQueryStore } from './query/circlesContactsQueryStore';
import type { Address } from '@circles-sdk/utils';

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

avatar.subscribe(($avatar) => {
  if ($avatar) {
    if (currentStoreUnsubscribe) {
      currentStoreUnsubscribe();
    }

    currentQuery = createContactsQueryStore($avatar.address, refreshOnEvents);
    currentQuery.then((store) => {
      currentStoreUnsubscribe = store.subscribe(contacts.set);
    });
  } else {
    if (currentStoreUnsubscribe) {
      currentStoreUnsubscribe();
      currentStoreUnsubscribe = undefined;
    }
    currentQuery = undefined;
    contacts.set({
      data: {},
      next: async () => false,
      ended: true,
    });
  }
});
