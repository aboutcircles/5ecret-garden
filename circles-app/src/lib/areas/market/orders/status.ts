// Order domain helpers

/**
 * Convert an IRI-like order status to a short label for display.
 * Example: https://schema.org/PaymentComplete -> PaymentComplete
 */
export function statusLabel(status?: string | null): string | null {
  if (!status) return null;
  try {
    const u = new URL(status);
    return u.pathname.split('/').pop() || status;
  } catch {
    return status;
  }
}

/**
 * Best-effort local timestamp formatting for ISO strings. Returns the input on parse failures.
 */
export function formatTimestamp(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso ?? '');
  }
}
