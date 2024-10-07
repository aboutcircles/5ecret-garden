import { get } from "svelte/store";
import { avatar } from "$lib/stores/avatar";
import type { AvatarRow, CirclesEvent, CirclesEventType, CirclesQuery, TrustListRow, TrustRelation, TrustRelationRow } from "@circles-sdk/data";
import type { Profile } from "@circles-sdk/profiles";
import { createEventStore } from "$lib/stores/eventStores/eventStoreFactory";
import { getProfile } from "$lib/components/Avatar.svelte";
import type { ExtendedTrustRelationRow } from "../../routes/_new/contacts/+page.svelte";
import { circles } from "$lib/stores/circles";

export type ContactListItem = {
    contactProfile: Profile;
    avatarInfo?: AvatarRow;
    row: ExtendedTrustRelationRow;
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

    // const contacts = await avatarInstance.getTrustRelations();
    const sdk = get(circles);
    const trustsQuery = sdk?.data.getTrustRelations(avatarInstance.address, 1000);
    if (!trustsQuery) {
        return {};
    }
    const contacts = await getAggregatedTrustRelations(avatarInstance.address, trustsQuery);

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

        // const contacts = await avatarInstance.getTrustRelations();
        const sdk = get(circles);
        const trustsQuery = sdk?.data.getTrustRelations(avatarInstance.address, 1000);
        if (!trustsQuery) {
            return {};
        }
        const contacts = await getAggregatedTrustRelations(avatarInstance.address, trustsQuery);
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

async function getAggregatedTrustRelations(avatarAddress: string, trustsQuery: CirclesQuery<TrustListRow>): Promise<ExtendedTrustRelationRow[]> {
    const pageSize = 1000;
    const trustListRows: TrustListRow[] = [];

    // Fetch all trust relations
    while (await trustsQuery.queryNextPage()) {
        const resultRows = trustsQuery.currentPage?.results ?? [];
        if (resultRows.length === 0) break;
        trustListRows.push(...resultRows);
        if (resultRows.length < pageSize) break;
    }

    // Group trust list rows by truster and trustee
    const trustBucket: { [avatar: string]: TrustListRow[] } = {};
    trustListRows.forEach(row => {
        if (row.truster !== avatarAddress) {
            trustBucket[row.truster] = trustBucket[row.truster] || [];
            trustBucket[row.truster].push(row);
        }
        if (row.trustee !== avatarAddress) {
            trustBucket[row.trustee] = trustBucket[row.trustee] || [];
            trustBucket[row.trustee].push(row);
        }
    });

    // Determine trust relations
    return Object.entries(trustBucket)
        .filter(([avatar]) => avatar !== avatarAddress)
        .map(([avatar, rows]) => {
            const maxTimestamp = Math.max(...rows.map(o => o.timestamp));
            let relation: TrustRelation;
            let trustVersion: number = rows[0].version;

            if (rows.length === 2) {
                relation = 'mutuallyTrusts';
            } else if (rows[0].trustee === avatarAddress) {
                relation = 'trustedBy';
            } else if (rows[0].truster === avatarAddress) {
                relation = 'trusts';
            } else {
                throw new Error('Unexpected trust list row. Couldnt determine trust relation.');
            }

            return {
                subjectAvatar: avatarAddress,
                relation: relation,
                objectAvatar: avatar,
                timestamp: maxTimestamp,
                trustVersion: trustVersion
            };
        });
}


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

    const avatarInfos: AvatarRow[] = await get(circles)?.data.getAvatarInfos(Object.keys(profileRecord)) ?? [];
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

export const createContacts = () =>
    createEventStore<ContactList>(
        avatar,
        refreshOnEvents,
        _initialLoad,
        _handleEvent,
        _handleNextPage,
        {}
    );
