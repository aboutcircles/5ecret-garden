export type TabIdOf<T extends readonly string[]> = T[number];

export function isTabId<T extends readonly string[]>(
  tabIds: T,
  v: string | null | undefined,
): v is TabIdOf<T> {
  return !!v && (tabIds as readonly string[]).includes(v);
}

export function coerceTabId<T extends readonly string[]>(
  tabIds: T,
  v: string | null | undefined,
  fallback: TabIdOf<T>,
): TabIdOf<T> {
  return isTabId(tabIds, v) ? v : fallback;
}
