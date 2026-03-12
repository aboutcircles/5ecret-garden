import type { CirclesQuery } from '@aboutcircles/sdk-types';
import type { PagedQuery } from '@aboutcircles/sdk-rpc';

/**
 * Wraps a PagedQuery<T> (class from @aboutcircles/sdk-rpc) so it conforms
 * to the CirclesQuery<T> interface (from @aboutcircles/sdk-types).
 *
 * CirclesQuery<T> has: rows, hasMore, nextPage() → CirclesQuery<T>
 * PagedQuery<T> has:   queryNextPage() → boolean, currentPage.results
 *
 * The adapter eagerly fetches the first page so `.rows` is immediately available.
 */
export async function pagedQueryToCirclesQuery<T>(
  query: PagedQuery<T>
): Promise<CirclesQuery<T>> {
  // Fetch the first page
  await query.queryNextPage();
  return wrapCurrentState(query);
}

function wrapCurrentState<T>(query: PagedQuery<T>): CirclesQuery<T> {
  return {
    rows: query.currentPage?.results ?? [],
    hasMore: query.currentPage?.hasMore ?? false,
    async nextPage(): Promise<CirclesQuery<T>> {
      await query.queryNextPage();
      return wrapCurrentState(query);
    },
  };
}
