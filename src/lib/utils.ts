import type { Page } from '@/types/api';

/** Returns a record ID or fails loudly when the API omitted it. */
export function idOf(record: { id: string | null }): string {
  if (!record.id) throw new Error('API record is missing its ID.');
  return record.id;
}

/** Empty string → `null`; otherwise a finite number within bounds. */
export function nullableNumber(
  value: string,
  min = -Number.MAX_VALUE,
  max = Number.MAX_VALUE,
): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`Value must be between ${min} and ${max}.`);
  }
  return n;
}

/** Trims and converts an empty string to `null`. */
export const emptyToNull = (value: string | null | undefined): string | null =>
  value?.trim() ? value.trim() : null;

/** `2001-02-03T…` → `2001-02-03` for `<input type="date">`. */
export const dateInput = (value: string | null | undefined): string => value?.slice(0, 10) ?? '';

const timestamp = (value: string | null | undefined) => Date.parse(value ?? '') || 0;

/** Newest first, without mutating the input. */
export function newest<T>(items: readonly T[], date: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => timestamp(date(b)) - timestamp(date(a)));
}

/** Oldest first, without mutating the input. */
export function oldest<T>(items: readonly T[], date: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => timestamp(date(a)) - timestamp(date(b)));
}

/** Client-side pagination for endpoints that return plain arrays. */
export function localPage<T>(items: readonly T[], page = 1, pageSize = 20): Page<T> {
  const totalPages = Math.ceil(items.length / pageSize);
  const current = Math.max(1, Math.min(page, totalPages || 1));
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageSize,
    totalItems: items.length,
    totalPages,
  };
}

/** Converts local date inputs to an inclusive ISO range. */
export function dateRange(from: string, to: string): { fromDate?: string; toDate?: string } {
  if (from && to && from > to) throw new Error('The start date must not be after the end date.');
  return {
    ...(from ? { fromDate: new Date(`${from}T00:00:00`).toISOString() } : {}),
    ...(to ? { toDate: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
  };
}

export function initials(value: string | null | undefined): string {
  if (!value?.trim()) return 'AR';
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Case-insensitive "contains" across several fields. */
export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return fields.some((field) => (field ?? '').toLocaleLowerCase().includes(needle));
}

/** Only http(s) URLs may become links. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
