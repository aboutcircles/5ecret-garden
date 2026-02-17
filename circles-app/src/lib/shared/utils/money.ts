// Shared money formatting utilities used across the app.

export function formatCurrency(amount: number | null | undefined, code: string | null | undefined): string {
  if (amount == null || !Number.isFinite(Number(amount))) {
    return '?';
  }
  const value = Number(amount);
  const rounded = value.toFixed(2);
  return code ? `${rounded} ${code}` : rounded;
}

export function formatCompactCurrency(
  amount: number | null | undefined,
  code: string | null | undefined,
  options: { maximumFractionDigits?: number } = {}
): string {
  if (amount == null || !Number.isFinite(Number(amount))) {
    return '?';
  }

  const value = Number(amount);
  const formatter = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });
  const formatted = formatter.format(value);
  return code ? `${formatted} ${code}` : formatted;
}
