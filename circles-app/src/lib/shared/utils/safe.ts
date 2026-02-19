export function safeParse<T>(label: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    console.debug(label, e);
    return fallback;
  }
}
