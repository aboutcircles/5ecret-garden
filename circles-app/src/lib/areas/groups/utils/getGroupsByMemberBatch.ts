import type { Address, Filter } from '@aboutcircles/sdk-types';
import type { Sdk } from '@aboutcircles/sdk';
import type { GroupRow, GroupMembershipRow, PagedQueryParams } from '@aboutcircles/sdk-types';
import { PagedQuery } from '@aboutcircles/sdk-rpc';

// Keep aligned with GROUP_MEMBERS_PAGE_SIZE (the inverse direction) and the
// transaction-history page size — all use 25 so paint feels consistent across
// related lists.
export const MEMBERSHIPS_PAGE_SIZE = 25;

const GROUP_DETAIL_COLUMNS = [
  'blockNumber',
  'timestamp',
  'transactionIndex',
  'logIndex',
  'transactionHash',
  'group',
  'type',
  'owner',
  'mintPolicy',
  'mintHandler',
  'treasury',
  'service',
  'feeCollection',
  'memberCount',
  'name',
  'symbol',
  'cidV0Digest',
  'erc20WrapperDemurraged',
  'erc20WrapperStatic',
] as const;

/**
 * Build an OR conjunction of Equals predicates to simulate an IN filter.
 * The new SDK FilterType does not support 'In'; use Conjunction instead.
 */
function buildInFilter(column: string, values: string[]): Filter {
  if (values.length === 1) {
    return { Type: 'FilterPredicate', FilterType: 'Equals', Column: column, Value: values[0] };
  }
  return {
    Type: 'Conjunction',
    ConjunctionType: 'Or',
    Predicates: values.map((v) => ({
      Type: 'FilterPredicate' as const,
      FilterType: 'Equals' as const,
      Column: column,
      Value: v,
    })),
  };
}

/**
 * Stream group rows the avatar is a member of, page-by-page. The callback is
 * invoked once per page of detail rows so the UI can render rows as they
 * arrive instead of waiting for the full set.
 *
 * The page size aligns with GROUP_MEMBERS_PAGE_SIZE and the tx-history page
 * size (25) — keeps the perceived load time consistent across related lists.
 */
export async function streamGroupsByMember(
  sdk: Sdk,
  member: Address,
  onBatch: (batch: GroupRow[]) => void,
  pageSize: number = MEMBERSHIPS_PAGE_SIZE
): Promise<void> {
  if (!sdk || !member) return;

  const membershipsQueryDef: PagedQueryParams = {
    namespace: 'V_CrcV2',
    table: 'GroupMemberships',
    columns: ['group', 'member'],
    filter: [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'member',
        Value: member.toLowerCase(),
      },
    ],
    sortOrder: 'DESC',
    limit: pageSize,
  };

  const membershipsQuery = new PagedQuery<GroupMembershipRow>(sdk.rpc.client, membershipsQueryDef);
  const seen = new Set<string>();

  while (await membershipsQuery.queryNextPage()) {
    const rows = membershipsQuery.currentPage?.results ?? [];
    if (rows.length === 0) break;

    const newAddrs = rows
      .map((m) => (m.group ?? '').toLowerCase())
      .filter((a) => a.length > 0 && !seen.has(a));
    newAddrs.forEach((a) => seen.add(a));

    if (newAddrs.length > 0) {
      const detailQueryDef: PagedQueryParams = {
        namespace: 'V_CrcV2',
        table: 'Groups',
        columns: [...GROUP_DETAIL_COLUMNS],
        filter: [buildInFilter('group', newAddrs)],
        sortOrder: 'DESC',
        limit: pageSize * 2,
      };
      const detailQuery = new PagedQuery<GroupRow>(sdk.rpc.client, detailQueryDef);

      const batch: GroupRow[] = [];
      while (await detailQuery.queryNextPage()) {
        const detailRows = detailQuery.currentPage?.results ?? [];
        batch.push(...detailRows);
        if (!detailQuery.currentPage?.hasMore) break;
      }

      if (batch.length > 0) onBatch(batch);
    }

    if (!membershipsQuery.currentPage?.hasMore) break;
  }
}

/**
 * Exhaustive collect-all wrapper preserved for callers that need the full
 * array up front (e.g. the "My groups" tab which merges memberships with
 * owner-based results).
 */
export async function getGroupsByMember(sdk: Sdk, member: Address): Promise<GroupRow[]> {
  const acc: GroupRow[] = [];
  await streamGroupsByMember(sdk, member, (batch) => acc.push(...batch));
  return acc;
}