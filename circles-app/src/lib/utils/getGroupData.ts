import type { Address } from '@circles-sdk/utils';
import { CirclesQuery, type PagedQueryParams } from '@circles-sdk/data';
import type { Sdk } from '@circles-sdk/sdk';

export async function getDailyCmGroupsDataOverTheMonth(sdk: Sdk, group: Address): Promise<{ [date: string]: { memberCount: number, trustedCount: number, timestamp: number } }> {
    if (!sdk) {
        return {};
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoTs = oneMonthAgo.getTime() / 1000;
    console.log('oneMonthAgoTs', oneMonthAgoTs);

    const queryDefinition: PagedQueryParams = {
        namespace: 'V_CrcV2',
        table: 'Groups',
        columns: [
            'timestamp',
            'memberCount',
            'trustedCount'
        ],
        filter: [
            {
                Type: 'FilterPredicate',
                FilterType: 'Equals',
                Column: 'group',
                Value: group,
            },
            {
                Type: 'FilterPredicate',
                FilterType: 'GreaterThanOrEquals',
                Column: 'timestamp',
                Value: oneMonthAgoTs,
            }
        ],
        sortOrder: 'ASC',
        limit: 1000,
    };

    const query = new CirclesQuery(sdk.circlesRpc, queryDefinition);
    const allResults: any[] = [];

    while (await query.queryNextPage()) {
        const resultRows = query.currentPage?.results ?? [];
        console.log('resultRows', resultRows);
        allResults.push(...resultRows);
    }

    const dailyData: { [date: string]: any } = {};
    allResults.forEach(record => {
        const dateObj = new Date(record.timestamp);
        const dateStr = dateObj.toISOString().split('T')[0];
        if (!dailyData[dateStr]) {
            dailyData[dateStr] = record;
        } else {
            if (record.timestamp > dailyData[dateStr].timestamp) {
                dailyData[dateStr] = record;
            }
        }
    });

    return dailyData;
}
