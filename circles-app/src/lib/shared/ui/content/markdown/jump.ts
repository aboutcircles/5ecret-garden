export function jumpHref(destination: string): string {
  return `/jump?to=${encodeURIComponent(destination)}`;
}
