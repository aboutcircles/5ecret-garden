// Shared money formatting utilities used across the app.

export function formatCurrency(amount: number | null | undefined, code: string | null | undefined): string {
  if (amount == null || !Number.isFinite(Number(amount))) {
    return '?';
  }
  const value = Number(amount);
  const rounded = value.toFixed(2);
  return code ? `${rounded} ${code}` : rounded;
}
