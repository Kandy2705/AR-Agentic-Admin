export const idOf = (value: { id: string | null }): string => { if (!value.id) throw new Error('API record is missing its ID.'); return value.id; };
export function nullableNumber(value: string, min: number, max: number): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Value must be between ${min} and ${max}.`);
  return n;
}
export function dateInput(value: string | null | undefined): string { return value?.slice(0, 10) || ''; }
export function newest<T>(items: T[], date: (item: T) => string | null): T[] { return [...items].sort((a, b) => (Date.parse(date(b) || '') || 0) - (Date.parse(date(a) || '') || 0)); }
export function localPage<T>(items: T[], page = 1, pageSize = 20) {
  const totalPages = Math.ceil(items.length / pageSize), current = Math.max(1, Math.min(page, totalPages || 1));
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, pageSize, totalItems: items.length, totalPages };
}
export function dateRange(from: string, to: string): { fromDate?: string; toDate?: string } {
  if (from && to && from > to) throw new Error('The start date must not be after the end date.');
  return { ...(from ? { fromDate: new Date(from + 'T00:00:00').toISOString() } : {}), ...(to ? { toDate: new Date(to + 'T23:59:59.999').toISOString() } : {}) };
}
export function initials(value: string | null | undefined): string { return (value || 'AR').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase(); }
