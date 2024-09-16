import {get, type Readable, writable} from "svelte/store";
import {avatar} from "$lib/stores/avatar";
import type {CirclesEvent, CirclesEventType} from "@circles-sdk/data";
import type {Profile} from "@circles-sdk/profiles";
import {createEventStore} from "$lib/stores/eventStores/eventStoreFactory";
import {getProfile} from "$lib/components/Avatar.svelte";
import type {ExtendedTrustRelationRow} from "../../routes/contacts/+page.svelte";

export type ContactList = Record<string, {
    contactProfile: Profile;
    row: ExtendedTrustRelationRow
}>;

const refreshOnEvents: Set<CirclesEventType> = new Set([
    "CrcV1_Trust",
    "CrcV2_Trust",
    "CrcV2_InviteHuman"
]);

const _initialLoad = async () => {
    const avatarInstance = get(avatar);
    if (!avatarInstance) {
        return {};
    }

    const contacts = await avatarInstance.getTrustRelations();
    if (contacts && contacts.length > 0) {
        return await enrichContactData(contacts);
    }

    return {};
};

const _handleEvent = async (event: CirclesEvent, currentData: ContactList) => {
    if (!refreshOnEvents.has(event.$event)) {
        return currentData;
    }

    try {
        const avatarInstance = get(avatar);
        if (!avatarInstance) {
            return currentData;
        }

        const contacts = await avatarInstance.getTrustRelations();
        if (contacts && contacts.length > 0) {
            return await enrichContactData(contacts);
        }

        return currentData;
    } catch (e) {
        console.error(`Failed to update contacts on event ${event.$event}`, e);
        return currentData;
    }
};

const _handleNextPage = async (currentData: ContactList) => {
    return {data: currentData, ended: true};
};

async function enrichContactData(rows: ExtendedTrustRelationRow[]): Promise<ContactList> {
    const profileRecord: ContactList = {};

    const promises = rows.map(async row => {
        const profile = await getProfile(row.objectAvatar);
        if (profile) {
            profileRecord[row.objectAvatar] = {
                contactProfile: profile,
                row: row
            };
        }
    });

    await Promise.all(promises);

    return profileRecord;
}

export const createContacts = () =>
    createEventStore<ContactList>(
        avatar,
        refreshOnEvents,
        _initialLoad,
        _handleEvent,
        _handleNextPage,
        {}
    );
