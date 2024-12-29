import { get, writable } from "svelte/store";
import { avatar } from "$lib/stores/avatar";
import type {
    AvatarRow,
    CirclesEvent,
    CirclesEventType,
    TrustRelationRow
} from "@circles-sdk/data";
import type { Profile } from "@circles-sdk/profiles";
import { createEventStore } from "$lib/stores/eventStores/eventStoreFactory";
import { circles } from "$lib/stores/circles";
import { getProfile } from "$lib/utils/profile";
import type { Avatar } from "@circles-sdk/sdk";

export type ContactListItem = {
    contactProfile: Profile;
    avatarInfo?: AvatarRow;
    row: TrustRelationRow;
};

export type ContactList = Record<string, ContactListItem>;

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

    const sdk = get(circles);
    const contacts = await sdk?.data.getAggregatedTrustRelations(avatarInstance.address);

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

        const sdk = get(circles);
        if (!sdk) {
            return currentData;
        }

        const contacts = await sdk.data.getAggregatedTrustRelations(avatarInstance.address);
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
    return { data: currentData, ended: true };
};

async function enrichContactData(rows: TrustRelationRow[]): Promise<ContactList> {
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

    const avatarInfos: AvatarRow[] = await get(circles)?.data.getAvatarInfoBatch(Object.keys(profileRecord)) ?? [];
    const avatarInfoRecord: Record<string, AvatarRow> = {};
    avatarInfos.forEach(info => {
        avatarInfoRecord[info.avatar] = info;
    });

    Object.values(profileRecord).forEach(item => {
        const info = avatarInfoRecord[item.row.objectAvatar];
        if (info) {
            item.avatarInfo = info;
        }
    });

    return profileRecord;
}

// export const createContacts = () =>
//     createEventStore<ContactList>(
//         avatar,
//         refreshOnEvents,
//         _initialLoad,
//         _handleEvent,
//         _handleNextPage,
//         {}
//     );

export const contacts = createEventStore<ContactList>(
    avatar,
    refreshOnEvents,
    _initialLoad,
    _handleEvent,
    async () => ({ data: {}, ended: true }),
    {}
);