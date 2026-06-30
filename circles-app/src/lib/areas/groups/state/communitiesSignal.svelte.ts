/**
 * A minimal cross-component signal so a community join/leave performed outside the
 * Communities tab (e.g. joining from the Discover list) invalidates its cached
 * data. The tab's loader folds `token` into its cache key; bumping it forces a
 * reload the next time the tab is viewed.
 */
export const communitiesRefresh = $state<{ token: number }>({ token: 0 });

/** Invalidate the Communities tab's cached data, forcing a reload on next view. */
export function invalidateCommunities(): void {
  communitiesRefresh.token += 1;
}
